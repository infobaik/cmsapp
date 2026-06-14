import { Hono } from 'hono'

const app = new Hono()

// Middleware khusus untuk mengecek API Key WA di Header atau Query Parameter
app.use('/*', async (c, next) => {
  const apiKey = c.req.header('x-api-key') || c.req.query('api_key')
  
  if (!apiKey) {
    return c.json({ error: 'Unauthorized. API Key is missing.' }, 401)
  }

  // Validasi API Key ke D1
  const user = await c.env.DB.prepare(`SELECT id FROM users WHERE api_key = ?`).bind(apiKey).first()
  if (!user) {
    return c.json({ error: 'Invalid API Key.' }, 403)
  }

  // Loloskan ke endpoint
  await next()
})

// Endpoint Action: Mendapatkan Katalog Produk untuk Bot WA
app.get('/catalog', async (c) => {
  const products = await c.env.DB.prepare(`SELECT id, name, price FROM products WHERE status = 'active'`).all()
  return c.json({
    status: 'success',
    source: 'WhatsApp Bot API',
    data: products.results
  })
})

export default app
