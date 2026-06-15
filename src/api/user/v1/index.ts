import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { dispatchProviderOrder } from '../../../services/providers/index'

const app = new Hono()

// ========================================================================
// MIDDLEWARE PROTEKSI: HANYA MEMBER YANG BOLEH MENGEKSEKUSI API INI
// ========================================================================
app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  // Tarik data sesi dan pastikan belum kedaluwarsa
  const user = await c.env.DB.prepare(`
    SELECT u.id FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(sessionId).first()

  if (!user) {
    return c.redirect('/login')
  }

  // Simpan user_id ke context agar bisa dipakai di route bawahnya
  c.set('user_id', user.id)
  await next()
})

// ========================================================================
// ENDPOINT CREATE ORDER / TRANSAKSI PPOB
// ========================================================================
app.post('/order/create', async (c) => {
  const userId = c.get('user_id')
  const body = await c.req.parseBody()

  const productId = parseInt(body.product_id as string)
  const customerNumber = body.customer_number as string

  try {
    // 1. Ambil data produk dan kredensial provider secara komprehensif
    const product = await c.env.DB.prepare(`
      SELECT p.*, pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret
      FROM products p
      JOIN providers pr ON p.provider_id = pr.id
      WHERE p.id = ? AND p.status = 'active'
    `).bind(productId).first()

    if (!product) {
      return c.redirect('/user/dashboard?error=Produk+tidak+tersedia+atau+sedang+gangguan')
    }

    const price = Number(product.price)
    // Gunakan timestamp dan random string sebagai ID transaksi unik (ref_id)
    const trxId = 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000)

    // 2. POTONG SALDO AMAN (Mencegah Race Condition saat transaksi massal)
    // Klausa RETURNING id memastikan query ini hanya berhasil jika saldo memang >= harga
    const deduct = await c.env.DB.prepare(`
      UPDATE wallets
      SET balance_available = balance_available - ?
      WHERE user_id = ? AND balance_available >= ?
      RETURNING id
    `).bind(price, userId, price).first()

    if (!deduct) {
      return c.redirect('/user/dashboard?error=Saldo+tidak+mencukupi')
    }

    // 3. Catat transaksi awal ke database dengan status 'processing'
    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, total_price, status, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)
    `).bind(trxId, userId, productId, customerNumber, product.order_type, price, trxId).run()

    // 4. Eksekusi Order ke Provider
    try {
      const providerCreds = {
        endpoint: product.api_endpoint,
        key: product.api_key,
        secret: product.api_secret
      }

      // Lempar ke dispatcher yang sebelumnya kita buat
      const orderResult = await dispatchProviderOrder(
        product.provider_name as string,
        'payment', 
        providerCreds,
        product.provider_product_code as string,
        customerNumber,
        trxId
      )

      // 5. Simpan RAW RESPONSE secara utuh! 
      // Digiflazz membalas 'Sukses', 'Pending', atau 'Gagal' pada raw response-nya
      let finalStatus = 'processing' // Default jika Digiflazz membalas 'Pending'
      const provData = orderResult.raw_response?.data

      if (provData?.status === 'Sukses') {
         finalStatus = 'success'
      } else if (provData?.status === 'Gagal') {
         finalStatus = 'failed'
      }

      await c.env.DB.prepare(`
        UPDATE transactions
        SET status = ?, provider_response = ?
        WHERE id = ?
      `).bind(finalStatus, JSON.stringify(orderResult.raw_response), trxId).run()

      // Jika status dari API langsung menyatakan Gagal (Stok kosong / gangguan provider)
      if (finalStatus === 'failed') {
        await c.env.DB.prepare(`
          UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?
        `).bind(price, userId).run()
        
        return c.redirect(`/user/order/${trxId}?error=Transaksi+Gagal+oleh+Provider.+Dana+telah+di-refund.`)
      }

      // Jika Sukses atau Processing (Webhook yang akan melanjutkannya nanti)
      return c.redirect(`/user/order/${trxId}?success=true`)

    } catch (providerError: any) {
      // 6. TANGKAP ERROR (Misal koneksi API putus, salah key, atau throw Gagal dari digiflazz.ts)
      // Simpan raw error untuk debugging murni
      const rawErrorText = providerError.message || String(providerError)

      await c.env.DB.batch([
        // Update status transaksi jadi gagal dan simpan log errornya
        c.env.DB.prepare(`
          UPDATE transactions
          SET status = 'failed', provider_response = ?
          WHERE id = ?
        `).bind(rawErrorText, trxId),

        // Auto-Refund Saldo
        c.env.DB.prepare(`
          UPDATE wallets
          SET balance_available = balance_available + ?
          WHERE user_id = ?
        `).bind(price, userId)
      ])

      return c.redirect(`/user/order/${trxId}?error=Transaksi+Gagal.+Saldo+telah+dikembalikan.`)
    }

  } catch (systemError: any) {
    console.error("Kesalahan Sistem Order:", systemError)
    return c.redirect('/user/dashboard?error=Terjadi+kesalahan+sistem')
  }
})

export default app
