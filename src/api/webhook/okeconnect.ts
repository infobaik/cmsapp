import { Hono } from 'hono'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const trxId = c.req.query('refid')
    const message = c.req.query('message') || ''

    if (!trxId) return c.text('No Reference ID', 400)

    let localStatus = 'processing'
    const upperMessage = message.toUpperCase()
    
    if (upperMessage.includes('SUKSES') || upperMessage.includes('SUCCESS')) {
      localStatus = 'success'
    } else if (upperMessage.includes('GAGAL') || upperMessage.includes('FAILED')) {
      localStatus = 'failed'
    }

    const trx = await c.env.DB.prepare(`
      SELECT user_id, order_type, admin_markup, total_price 
      FROM transactions 
      WHERE id = ?
    `).bind(trxId).first()

    if (trx) {
       const batchStatements = []

       // =====================================================================
       // 🧹 1. LOGIKA EKSTRAKSI NAMA PELANGGAN & BLOK SN BERSIH
       // =====================================================================
       let cleanLog = message;
       // Regex ini memotong mulai dari "SN:" sampai tepat sebelum ". Saldo"
       // Menghasilkan: SN: H GOJALI B BURHAN/TAG:63740/ADMIN:3000/TTAG:66740/...
       const snMatch = message.match(/SN:\s*(.*?)(?=\.\s*Saldo|\.$|$)/i);
       
       if (snMatch) {
           cleanLog = "SN: " + snMatch[1];
       } else {
           // Fallback aman jika kata SN tidak ada
           cleanLog = message.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();
       }

       // =====================================================================
       // 🔥 2. LOGIKA POSTPAID (TAGIHAN) 🔥
       // =====================================================================
       if (trx.order_type === 'postpaid' && localStatus === 'success') {
          
          // Ekstrak nilai TTAG dari blok yang sudah bersih
          const tagMatch = cleanLog.match(/TTAG\:(\d+)/i) || cleanLog.match(/TAG\:(\d+)/i)
          const providerPrice = tagMatch ? Number(tagMatch[1]) : 0

          const newTotalPrice = providerPrice + Number(trx.admin_markup)
          
          // 3. FORMAT FINAL SESUAI PERMINTAAN ANDA:
          // SN: H GOJALI B BURHAN/TAG:63740...MET:18163-18298. 66740
          const finalLog = `${cleanLog} ${providerPrice}`;
          
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = 'waiting_payment', 
                  bill_amount = ?, 
                  total_price = ?, 
                  provider_response = ?,
                  server_log = ?
              WHERE id = ? AND status != 'success'
            `).bind(providerPrice, newTotalPrice, message, finalLog, trxId)
          )
       } 
       // =====================================================================
       // 🟢 3. LOGIKA PREPAID (PULSA/KUOTA) ATAU TRANSAKSI GAGAL
       // =====================================================================
       else {
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = ?, provider_response = ?, server_log = ?
              WHERE id = ? AND status != 'success'
            `).bind(localStatus, message, cleanLog, trxId)
          )

          // Auto-Refund untuk transaksi gagal
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

    return c.text('OK', 200)
    
  } catch (error) {
    console.error('OkeConnect Webhook Error:', error)
    return c.text('Internal Server Error', 500)
  }
})

app.post('/', async (c) => {
  return c.text('Gunakan metode GET sesuai standar API OkeConnect', 200)
})

export default app
