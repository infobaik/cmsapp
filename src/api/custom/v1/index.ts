import { Hono } from 'hono'

const app = new Hono()

// Middleware B2B: Cek kombinasi Client ID dan Secret Key
app.use('/*', async (c, next) => {
  const clientId = c.req.header('X-Client-ID')
  const clientSecret = c.req.header('X-Client-Secret')

  const client = await c.env.DB.prepare(`SELECT user_id FROM b2b_clients WHERE client_id = ? AND secret_key = ? AND status = 'active'`).bind(clientId, clientSecret).first()

  if (!client) {
    return c.json({ code: 403, error: 'Akses B2B Ditolak' }, 403)
  }

  c.set('b2b_user_id', client.user_id)
  await next()
})

// Endpoint B2B untuk melakukan order sistem secara programatik
app.post('/order', async (c) => {
  const b2bUserId = c.get('b2b_user_id')
  const body = await c.req.json()
  
  // (Di sini Anda memanggil fungsi dari src/services/stock.ts yang kita buat sebelumnya)
  // const result = await processProductOrder(c.env.DB, body.product_id, b2bUserId)

  return c.json({
    code: 200,
    message: "Pesanan B2B berhasil diproses",
    trx_id: crypto.randomUUID()
    // data: result
  })
})

export default app
