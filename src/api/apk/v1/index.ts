import { Hono } from 'hono'
import { verify } from 'hono/jwt'

const app = new Hono()

// Middleware Autentikasi Khusus APK (Verifikasi Stateless JWT)
app.use('/*', async (c, next) => {
  const authHeader = c.req.header('Authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ status: 'error', message: 'Token tidak valid atau kosong' }, 401)
  }

  const token = authHeader.split(' ')[1]

  try {
    // VERIFIKASI JWT SECARA EKSPLISIT DENGAN ALG HS256
    // Fungsi ini akan otomatis melempar error jika token diubah (Signature Invalid) 
    // atau jika token sudah melewati batas waktu (Expired)
    const decodedPayload = await verify(token, c.env.JWT_SECRET, 'HS256')
    
    // Simpan User ID ke context agar bisa dipakai oleh endpoint di bawahnya
    c.set('apk_user_id', decodedPayload.sub)
    
    await next()
  } catch (error: any) {
    // Tangkap error jika token palsu atau kedaluwarsa
    return c.json({ status: 'error', message: 'Sesi APK kedaluwarsa atau token tidak valid' }, 401)
  }
})

// Endpoint untuk Homepage di Aplikasi Mobile
app.get('/home', async (c) => {
  const userId = c.get('apk_user_id')
  
  // Karena middleware lolos, userId pasti valid dari JWT
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
