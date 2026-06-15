import { Hono } from 'hono'

const app = new Hono()

// Fungsi bantuan untuk memvalidasi HMAC SHA-1 dari Webhook Digiflazz
async function verifyDigiflazzSignature(secret: string, payloadText: string, signatureHeader: string) {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['verify']
  )

  const signatureHex = signatureHeader.replace('sha1=', '')
  const signatureBytes = new Uint8Array(Math.ceil(signatureHex.length / 2))
  for (let i = 0; i < signatureBytes.length; i++) {
    signatureBytes[i] = parseInt(signatureHex.substring(i * 2, i * 2 + 2), 16)
  }

  return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(payloadText))
}

app.post('/', async (c) => {
  // 1. Ambil Signature dari Header
  const signatureHeader = c.req.header('x-hub-signature')
  if (!signatureHeader) return c.json({ error: 'Missing Signature' }, 400)

  // 2. Ambil Raw Body (Penting untuk divalidasi dan disimpan utuh)
  const rawBody = await c.req.text()
  let payload
  
  try {
    payload = JSON.parse(rawBody)
  } catch (e) {
    return c.json({ error: 'Invalid JSON' }, 400)
  }

  // 3. Tarik API Secret Digiflazz dari Database
  const provider = await c.env.DB.prepare(`SELECT api_secret FROM providers WHERE name = 'Digiflazz'`).first()
  if (!provider || !provider.api_secret) return c.json({ error: 'Provider configuration missing' }, 500)

  // 4. Verifikasi Keaslian Webhook
  const isValid = await verifyDigiflazzSignature(provider.api_secret as string, rawBody, signatureHeader)
  if (!isValid) return c.json({ error: 'Invalid Signature' }, 403)

  // 5. Eksekusi Perubahan Status Transaksi
  if (payload.data && payload.data.ref_id) {
    const trxId = payload.data.ref_id
    const providerStatus = payload.data.status
    
    let localStatus = 'processing'
    if (providerStatus === 'Sukses') localStatus = 'success'
    else if (providerStatus === 'Gagal') localStatus = 'failed'

    // Gunakan D1 Batch untuk memastikan atomisitas data
    const batchStatements = []

    // Update status transaksi dan biarkan raw_response tersimpan utuh
    batchStatements.push(
      c.env.DB.prepare(`
        UPDATE transactions 
        SET status = ?, provider_response = ? 
        WHERE id = ? AND status != 'success'
      `).bind(localStatus, rawBody, trxId)
    )

    // Logika Auto-Refund jika transaksi gagal dari sisi Digiflazz
    if (localStatus === 'failed') {
      const trx = await c.env.DB.prepare(`SELECT user_id, total_price FROM transactions WHERE id = ?`).bind(trxId).first()
      if (trx) {
        batchStatements.push(
          c.env.DB.prepare(`
            UPDATE wallets 
            SET balance_available = balance_available + ? 
            WHERE user_id = ?
          `).bind(trx.total_price, trx.user_id)
        )
      }
    }

    await c.env.DB.batch(batchStatements)
  }

  return c.text('OK', 200)
})

export default app
