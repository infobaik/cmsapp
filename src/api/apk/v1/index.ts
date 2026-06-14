import { Hono } from 'hono'

const app = new Hono()

// Middleware Autentikasi Khusus APK
app.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ status: 'error', message: 'Token tidak valid atau kosong' }, 401)
  }

  const token = authHeader.split(' ')[1]
  // Validasi token ke D1 (bisa menggunakan tabel mobile_sessions)
  const user = await c.env.DB.prepare(`SELECT user_id FROM mobile_sessions WHERE token = ?`).bind(token).first()
  
  if (!user) return c.json({ status: 'error', message: 'Sesi APK kedaluwarsa' }, 401)
  
  c.set('apk_user_id', user.user_id)
  await next()
})

// Endpoint untuk Homepage di Aplikasi Mobile
app.get('/home', async (c) => {
  const userId = c.get('apk_user_id')
  
  // Ambil saldo dan rekomendasi produk sekaligus untuk efisiensi HTTP Request di HP
  const wallet = await c.env.DB.prepare(`SELECT balance_available FROM wallets WHERE user_id = ?`).bind(userId).first()
  const { results: products } = await c.env.DB.prepare(`SELECT id, name, price FROM products LIMIT 5`).all()

  return c.json({
    status: 'success',
    data: {
      user_balance: wallet?.balance_available || 0,
      featured_products: products
    }
  })
})

export default app
