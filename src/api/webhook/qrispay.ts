import { Hono } from 'hono'

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

    // 5. Eksekusi Penambahan Saldo (Hanya jika status settlement/success)
    if (data.transaction_status === 'settlement' || data.transaction_status === 'success') {
      const orderId = data.order_id
      
      const deposit = await c.env.DB.prepare(`
        SELECT user_id, amount FROM deposits WHERE id = ? AND status = 'pending'
      `).bind(orderId).first()
      
      if (deposit) {
        await c.env.DB.batch([
          // Ubah status tiket jadi success
          c.env.DB.prepare(`UPDATE deposits SET status = 'success' WHERE id = ?`).bind(orderId),
          // Tambahkan saldo ke kantong user
          c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(deposit.amount, deposit.user_id)
        ])
      }
    }

    return c.text('OK', 200)

  } catch (error) {
    console.error('Qrispay Webhook Error:', error)
    return c.text('Internal Server Error', 500)
  }
})

export default app
