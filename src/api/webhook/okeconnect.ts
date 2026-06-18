import { Hono } from 'hono'

const app = new Hono()

app.post('/', async (c) => {
  try {
    // 1. Ambil raw data dari OkeConnect
    const rawBody = await c.req.text()
    let payload
    
    try {
      payload = JSON.parse(rawBody)
    } catch (e) {
      // Jika OkeConnect mengirim form-urlencoded (x-www-form-urlencoded), fallback ke parseBody
      payload = await c.req.parseBody()
    }

    // 2. Petakan Data dari OkeConnect
    // (OkeConnect biasanya mengirimkan parameter refID, status, harga, dan sn/keterangan)
    const trxId = payload.refID || payload.ref_id
    if (!trxId) return c.text('No Reference ID', 400)

    const providerStatus = String(payload.status || '').toUpperCase()
    
    // Ambil nominal tagihan murni dari server OkeConnect
    const providerPrice = Number(payload.harga || payload.price || 0)

    // 3. Terjemahkan Status OkeConnect ke Status Sistem Kita
    let localStatus = 'processing'
    if (providerStatus === 'SUKSES' || providerStatus === 'SUCCESS' || providerStatus === '1') {
      localStatus = 'success'
    } else if (providerStatus === 'GAGAL' || providerStatus === 'FAILED' || providerStatus === '2') {
      localStatus = 'failed'
    }

    // 4. Cari Transaksi di Database
    const trx = await c.env.DB.prepare(`
      SELECT user_id, order_type, admin_markup, total_price 
      FROM transactions 
      WHERE id = ?
    `).bind(trxId).first()

    if (trx) {
       const batchStatements = []

       // ================================================================
       // 🔥 LOGIKA POSTPAID (TAGIHAN) 🔥
       // Jika transaksi adalah tagihan dan OkeConnect merespon SUKSES menemukan tagihan
       // ================================================================
       if (trx.order_type === 'postpaid' && localStatus === 'success') {
          // Harga Jual Baru = Harga Asli Tagihan dari OkeConnect + Markup (Keuntungan Admin)
          const newTotalPrice = providerPrice + Number(trx.admin_markup)
          
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = 'waiting_payment', 
                  bill_amount = ?, 
                  total_price = ?, 
                  provider_response = ? 
              WHERE id = ? AND status != 'success'
            `).bind(providerPrice, newTotalPrice, rawBody, trxId)
          )
       } 
       // ================================================================
       // 🟢 LOGIKA PREPAID (PULSA/KUOTA) ATAU TRANSAKSI GAGAL
       // ================================================================
       else {
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = ?, provider_response = ? 
              WHERE id = ? AND status != 'success'
            `).bind(localStatus, rawBody, trxId)
          )

          // Auto-Refund: Jika transaksi gagal, kembalikan saldo ke dompet user
          if (localStatus === 'failed') {
            batchStatements.push(
              c.env.DB.prepare(`
                UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?
              `).bind(trx.total_price, trx.user_id)
            )
          }
       }
       
       // Eksekusi perubahan ke Database D1
       await c.env.DB.batch(batchStatements)
    }

    // Wajib merespon 200 OK agar OkeConnect tahu webhook sudah diterima
    return c.text('OK', 200)
    
  } catch (error) {
    console.error('OkeConnect Webhook Error:', error)
    return c.text('Internal Server Error', 500)
  }
})

export default app
