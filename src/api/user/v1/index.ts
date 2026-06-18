import { Hono } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import { dispatchProviderOrder } from '../../../services/providers/index'

const app = new Hono()

// ========================================================================
// MIDDLEWARE PROTEKSI: HANYA MEMBER YANG BOLEH MENGEKSEKUSI API INI
// ========================================================================
app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  try {
    // Tarik data sesi dan pastikan belum kedaluwarsa
    const user = await c.env.DB.prepare(`
      SELECT u.id FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
    `).bind(sessionId).first()

    if (!user) {
      // Bersihkan cookie jika sesi tidak valid/kedaluwarsa
      deleteCookie(c, 'session_id', { path: '/' })
      return c.redirect('/login')
    }

    // Simpan user_id ke context agar bisa dipakai di route bawahnya
    c.set('user_id', user.id)
    return await next()
  } catch (error) {
    console.error("User Middleware Error:", error)
    return c.redirect('/login')
  }
})

// ========================================================================
// ENDPOINT: KELUAR / LOGOUT
// ========================================================================
app.get('/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  
  if (sessionId) {
    // 1. Hapus record sesi dari database demi keamanan
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run()
    
    // 2. Hancurkan cookie di browser pengguna
    deleteCookie(c, 'session_id', { path: '/' })
  }
  
  return c.redirect('/login')
})

// ========================================================================
// ENDPOINT: BUAT TIKET DEPOSIT
// ========================================================================
app.post('/wallet/deposit', async (c) => {
  try {
    const userId = c.get('user_id')
    const body = await c.req.parseBody()
    
    const amount = Number(body.amount)
    const gatewayCode = body.gateway_code as string

    if (amount < 10000) return c.redirect('/user/wallet?error=minimal_10000')

    const depositId = `DEP-${crypto.randomUUID().split('-')[0].toUpperCase()}`

    await c.env.DB.prepare(`
      INSERT INTO deposits (id, user_id, amount, status) 
      VALUES (?, ?, ?, 'pending')
    `).bind(depositId, userId, amount).run()

    return c.redirect('/user/wallet?success=deposit_created')
  } catch (error) {
    console.error("Deposit Error:", error)
    return c.redirect('/user/wallet?error=system_error')
  }
})

// ========================================================================
// ENDPOINT: PENARIKAN SALDO (WITHDRAW)
// ========================================================================
app.post('/wallet/withdraw', async (c) => {
  try {
    const userId = c.get('user_id')
    
    // Kurangi saldo hanya jika saldo mencukupi (Rp 50.000)
    const result = await c.env.DB.prepare(`
      UPDATE wallets 
      SET balance_available = balance_available - 50000 
      WHERE user_id = ? AND balance_available >= 50000
    `).bind(userId).run()

    if (result.meta.changes === 0) return c.redirect('/user/wallet?error=saldo_tidak_cukup')
    
    return c.redirect('/user/wallet?success=penarikan_diproses')
  } catch (error) {
    console.error("Withdraw Error:", error)
    return c.redirect('/user/wallet?error=system_error')
  }
})

// ========================================================================
// ENDPOINT: CREATE ORDER / TRANSAKSI PPOB
// ========================================================================
app.post('/order/create', async (c) => {
  try {
    const userId = c.get('user_id')
    const body = await c.req.parseBody()

    const productId = parseInt(body.product_id as string)
    const customerNumber = body.customer_number as string

    // 1. Ambil data produk dan kredensial provider secara komprehensif
    const product = await c.env.DB.prepare(`
      SELECT p.*, pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url
      FROM products p
      JOIN providers pr ON p.provider_id = pr.id
      WHERE p.id = ? AND p.status = 'active'
    `).bind(productId).first()

    if (!product) {
      return c.redirect('/user/dashboard?error=Produk+tidak+tersedia+atau+sedang+gangguan')
    }

    const price = Number(product.price)
    // Gunakan timestamp dan random string sebagai ID transaksi unik
    const trxId = 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000)

    // 2. POTONG SALDO AMAN (Mencegah Race Condition)
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
        secret: product.api_secret,
        proxy_url: product.proxy_url // Proxy URL dioper ke Forwarder
      }

      const orderResult = await dispatchProviderOrder(
        product.provider_name as string,
        'payment', 
        providerCreds,
        product.provider_product_code as string,
        customerNumber,
        trxId
      )

      // 5. Simpan RAW RESPONSE secara utuh
      let finalStatus = 'processing' 
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

      // Jika status gagal (Stok kosong / gangguan provider)
      if (finalStatus === 'failed') {
        await c.env.DB.prepare(`
          UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?
        `).bind(price, userId).run()
        
        return c.redirect(`/user/order/${trxId}?error=Transaksi+Gagal+oleh+Provider.+Dana+telah+di-refund.`)
      }

      return c.redirect(`/user/order/${trxId}?success=true`)

    } catch (providerError: any) {
      // 6. TANGKAP ERROR API PROVIDER (Koneksi putus/Salah Key)
      const rawErrorText = providerError.message || String(providerError)

      await c.env.DB.batch([
        c.env.DB.prepare(`
          UPDATE transactions
          SET status = 'failed', provider_response = ?
          WHERE id = ?
        `).bind(rawErrorText, trxId),

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
