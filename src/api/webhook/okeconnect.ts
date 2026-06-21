import { Hono } from 'hono'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const trxId = c.req.query('refid')
    const message = c.req.query('message') || ''

    if (!trxId) return c.text('No Reference ID', 400)

    let localStatus = 'processing'
    const upperMessage = message.toUpperCase()
    
    if (upperMessage.includes('SUKSES') || upperMessage.includes('SUCCESS') || upperMessage.includes('LUNAS')) {
      localStatus = 'success'
    } else if (upperMessage.includes('GAGAL') || upperMessage.includes('FAILED')) {
      localStatus = 'failed'
    }

    const trx = await c.env.DB.prepare(`
      SELECT user_id, order_type, admin_markup, total_price, bill_amount, status 
      FROM transactions 
      WHERE id = ?
    `).bind(trxId).first()

    if (trx) {
       const batchStatements = []

       // 1. Ekstraksi Nomor SN Bersih
       let cleanLog = message;
       const snMatch = message.match(/SN:\s*(.*?)(?=\.\s*Saldo|\.$|$)/i);
       
       if (snMatch) {
           cleanLog = "SN: " + snMatch[1];
       } else {
           cleanLog = message.replace(/[\.\s,]*Saldo\s.*$/i, '').trim();
       }

       // 2. FASE INQUIRY (CEK TAGIHAN SAJA)
       if ((trx.order_type === 'inquiry' || trx.order_type === 'postpaid') && localStatus === 'success' && trx.bill_amount === 0) {
          
          const tagMatch = cleanLog.match(/TTAG\:(\d+)/i) || cleanLog.match(/TAG\:(\d+)/i)
          const providerPrice = tagMatch ? Number(tagMatch[1]) : 0

          const newTotalPrice = providerPrice + Number(trx.admin_markup)
          const finalLog = `${cleanLog} ${providerPrice}`;
          
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = 'waiting_payment', 
                  bill_amount = ?, 
                  total_price = ?, 
                  provider_response = ?,
                  server_log = ?
              WHERE id = ?
            `).bind(providerPrice, newTotalPrice, message, finalLog, trxId)
          )
       } 
       // 3. FASE PEMBAYARAN LUNAS ATAU PRABAYAR (PULSA/DANA)
       else {
          // Biarkan Webhook menyuntikkan SN asli secara PAKSA!
          batchStatements.push(
            c.env.DB.prepare(`
              UPDATE transactions 
              SET status = ?, provider_response = ?, server_log = ?
              WHERE id = ?
            `).bind(localStatus, message, cleanLog, trxId)
          )

          // 🔥 PERBAIKAN FATAL: Auto-Refund & Pencatatan Transparan di Ledger
          if (localStatus === 'failed' && trx.status !== 'failed') {
            // Ambil ID Wallet User terlebih dahulu
            const wallet = await c.env.DB.prepare(`SELECT id FROM wallets WHERE user_id = ?`).bind(trx.user_id).first();
            
            if (wallet) {
                // 1. Kembalikan Saldo (Refund)
                batchStatements.push(
                  c.env.DB.prepare(`
                    UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?
                  `).bind(trx.total_price, trx.user_id)
                );
                
                // 2. Catat Pemasukan (Credit) di Buku Besar
                batchStatements.push(
                  c.env.DB.prepare(`
                    INSERT INTO wallet_transactions (wallet_id, amount, type, status, description) 
                    VALUES (?, ?, 'credit', 'completed', ?)
                  `).bind(wallet.id, trx.total_price, `Refund Otomatis Webhook: ${trxId}`)
                );
            }
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
