import { Hono } from 'hono'

const app = new Hono()

// PERBAIKAN MUTLAK: Menggunakan app.get() karena OkeConnect mengirim via GET parameter
app.get('/', async (c) => {
  try {
    // 1. Ambil data dari URL Query (bukan dari Body JSON)
    const trxId = c.req.query('refid')
    const message = c.req.query('message') || ''

    if (!trxId) return c.text('No Reference ID', 400)

    // 2. Terjemahkan Status dari isi Pesan
    let localStatus = 'processing'
    const upperMessage = message.toUpperCase()
    
    if (upperMessage.includes('SUKSES') || upperMessage.includes('SUCCESS')) {
      localStatus = 'success'
    } else if (upperMessage.includes('GAGAL') || upperMessage.includes('FAILED')) {
      localStatus = 'failed'
    }

    // 3. Cari Transaksi di Database
    const trx = await c.env.DB.prepare(`
      SELECT user_id, order_type, admin_markup, total_price 
      FROM transactions 
      WHERE id = ?
    `).bind(trxId).first()

    if (trx) {
       const batchStatements = []

       // ================================================================
       // 🔥 LOGIKA POSTPAID (TAGIHAN) 🔥
       // Jika transaksi adalah tagihan dan OkeConnect merespon SUKSES
       // ================================================================
       if (trx.order_type === 'postpaid' && localStatus === 'success') {
          
          // Ekstrak Total Tagihan (TTAG) dari teks pesan OkeConnect menggunakan Regex
          // Contoh teks: "/TAG:63740/ADMIN:3000/TTAG:66740/"
          const tagMatch = message.match(/TTAG\:(\d+)/i) || message.match(/TAG\:(\d+)/i)
          const providerPrice = tagMatch ? Number(tagMatch[1]) : 0

          // Harga Jual Baru = Harga Asli Tagihan dari OkeConnect + Markup Anda
          const newTotalPrice = providerPrice + Number(trx.admin_markup)
          
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = 'waiting_payment', 
                  bill_amount = ?, 
                  total_price = ?, 
                  provider_response = ?,
                  server_log = ?
              WHERE id = ? AND status != 'success'
            `).bind(providerPrice, newTotalPrice, message, message, trxId)
          )
       } 
       // ================================================================
       // 🟢 LOGIKA PREPAID (PULSA/KUOTA) ATAU TRANSAKSI GAGAL
       // ================================================================
       else {
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = ?, provider_response = ?, server_log = ?
              WHERE id = ? AND status != 'success'
            `).bind(localStatus, message, message, trxId)
          )

          // Auto-Refund: Kembalikan saldo jika transaksi Gagal
          if (localStatus === 'failed') {
            batchStatements.push(
              c.env.DB.prepare(`
                UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?
              `).bind(trx.total_price, trx.user_id)
            )
          }
       }
       
       await c.env.DB.batch(batchStatements)
    }

    // Wajib merespon teks OK ke server OkeConnect
    return c.text('OK', 200)
    
  } catch (error) {
    console.error('OkeConnect Webhook Error:', error)
    return c.text('Internal Server Error', 500)
  }
})

// Berjaga-jaga jika sewaktu-waktu OkeConnect beralih ke POST JSON di masa depan
app.post('/', async (c) => {
  return c.text('Gunakan metode GET sesuai standar API OkeConnect', 200)
})

export default app
