import { createRoute } from 'honox/factory'
import { getCookie } from 'hono/cookie'
import { verify } from 'hono/jwt'

export default createRoute(async (c, next) => {
  // 1. Ambil cookie 'token' hasil dari login JWT tadi
  const token = getCookie(c, 'token')

  let user = null
  
  if (token) {
    try {
      const jwtSecret = c.env.JWT_SECRET || 'fallback-secret-key-123'
      
      // 2. Verifikasi dan ekstrak isi JWT
      // Tidak perlu lagi query SELECT ke database D1! Jauh lebih cepat!
      const payload = await verify(token, jwtSecret)
      
      user = {
        id: payload.id,
        name: payload.name,
        email: payload.email,
        role: payload.role
      }
    } catch (e) {
      console.error("JWT Verification Error:", e)
      // Jika token expired atau dimanipulasi, user tetap null (otomatis ter-logout)
    }
  }

  // Set context 'user' agar bisa diakses oleh _renderer dan rute lainnya
  c.set('user', user as any)
  
  await next()
})
