import { Hono } from 'hono'
import { dispatchProviderOrder } from '../../services/providers/index'
import { sendBrevoEmail } from '../../services/email'

const app = new Hono()

app.post('/', async (c) => {
  try {
    // 1. Ambil payload JSON mentah dan Signature Header
    const payloadText = await c.req.text()
    const signatureHeader = c.req.header('X-Signature') || ''
    
    if (!signatureHeader) return c.text('Missing Signature Header', 403)

    // 2. Tarik Secret Key (API Key) dari Database
    const gateway = await c.env.DB.prepare(`SELECT api_key FROM payment_gateways WHERE status = 'active' LIMIT 1`).first()
    if (!gateway || !gateway.api_key) return c.text('Gateway Not Configured', 500)

    const secretKey = gateway.api_key as string

    // 3. Eksekusi HMAC SHA-256 (Versi Web Crypto Edge API)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secretKey),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadText))
    const hashArray = Array.from(new Uint8Array(signatureBuffer))
    const calculatedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 4. Validasi Keamanan Tingkat Tinggi
    if (calculatedSignature !== signatureHeader) {
      return c.text('WEBHOOK INVALID - Akses ditolak!', 403)
    }

    const data = JSON.parse(payloadText)

    // 5. Eksekusi Berdasarkan Prefix Order ID
    if (data.transaction_status === 'settlement' || data.transaction_status === 'success') {
      const orderId = data.order_id
      
      // LOGIKA DEPOSIT MEMBER (TETAP SAMA)
      if (orderId.startsWith('DEP-')) {
        const deposit = await c.env.DB.prepare(`SELECT user_id, amount FROM deposits WHERE id = ? AND status = 'pending'`).bind(orderId).first()
        if (deposit) {
          const wallet = await c.env.DB.prepare(`SELECT id FROM wallets WHERE user_id = ?`).bind(deposit.user_id).first();
          if (wallet) {
              await c.env.DB.batch([
                c.env.DB.prepare(`UPDATE deposits SET status = 'success' WHERE id = ?`).bind(orderId),
                c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(deposit.amount, deposit.user_id),
                c.env.DB.prepare(`INSERT INTO wallet_transactions (wallet_id, amount, type, status, description) VALUES (?, ?, 'credit', 'completed', ?)`).bind(wallet.id, deposit.amount, `Deposit Saldo (${orderId})`)
              ])
          }
        }
      } 
      
      // 🔥 LOGIKA BARU: PUBLIC ORDER CHEKOUT
      else if (orderId.startsWith('TRX-')) {
        const trx = await c.env.DB.prepare(`
          SELECT t.*, p.provider_product_code, p.name as product_name, p.is_open_amount, 
                 pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url
          FROM transactions t
          JOIN products p ON t.product_id = p.id
          JOIN providers pr ON p.provider_id = pr.id
          WHERE t.id = ? AND t.status = 'waiting_payment' AND t.user_id = 0
        `).bind(orderId).first();

        if (trx) {
          // Kunci status jadi processing agar tidak digandakan
          await c.env.DB.prepare(`UPDATE transactions SET status = 'processing' WHERE id = ?`).bind(orderId).run();
          
          try {
            // Karena ini order publik, saldo dompet TIDAK dipotong. Langsung lempar ke provider!
            const inputAmount = trx.is_open_amount === 1 ? (trx.bill_amount as number) : 0;
            
            const providerResult = await dispatchProviderOrder(
              trx.provider_name as string, 'payment',
              { endpoint: trx.api_endpoint as string, key: trx.api_key as string, secret: trx.api_secret as string, proxy_url: trx.proxy_url as string },
              trx.provider_product_code as string, trx.customer_number as string, orderId, inputAmount
            );

            let rawText = typeof providerResult.raw_response === 'string' ? providerResult.raw_response : JSON.stringify(providerResult.raw_response);
            
            if (rawText.toUpperCase().includes('GAGAL')) {
               await c.env.DB.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`).bind(rawText, orderId).run();
               if (trx.guest_email) await sendBrevoEmail(c.env.DB, trx.guest_email as string, orderId, trx.product_name as string, '', 'GAGAL (Proses Refund Manual)');
            } else {
               let initialStatus = rawText.toUpperCase().includes('SUKSES') ? 'success' : 'processing';
               let sn = providerResult.sn || '';
               await c.env.DB.prepare(`UPDATE transactions SET status = ?, provider_response = ? WHERE id = ?`).bind(initialStatus, rawText, orderId).run();
               
               // Kirim Email Bukti Pembelian & Voucher (Jika sukses instan)
               if (trx.guest_email) {
                 await sendBrevoEmail(c.env.DB, trx.guest_email as string, orderId, trx.product_name as string, sn, initialStatus === 'success' ? 'SUKSES' : 'DIPROSES');
               }
            }
          } catch (e: any) {
            await c.env.DB.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`).bind(e.message, orderId).run();
          }
        }
      }
    }

    // 🔥 INI PENUTUP YANG HILANG SEBELUMNYA!
    return c.text('OK', 200)

  } catch (error) {
    console.error('Qrispay Webhook Error:', error)
    return c.text('Internal Server Error', 500)
  }
})

export default app
