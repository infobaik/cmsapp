import { createRoute } from 'honox/factory'
import { getCookie } from 'hono/cookie'

export default createRoute(async (c, next) => {
  // 1. Ambil cookie 'session_id' hasil dari login API
  const sessionId = getCookie(c, 'session_id')

  let user = null
  
  if (sessionId) {
    try {
      // 2. Verifikasi session ke database D1 sekaligus mengambil data user
      const sessionData = await c.env.DB.prepare(`
        SELECT u.id, u.name, u.email, u.role 
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
      `).bind(sessionId).first()
      
      if (sessionData) {
        user = {
          id: sessionData.id,
          name: sessionData.name,
          email: sessionData.email,
          role: sessionData.role
        }
      }
    } catch (e) {
      console.error("Session Verification Error:", e)
      // Jika error database atau session expired, user tetap null (otomatis ter-logout)
    }
  }

  // 3. Set context 'user' agar bisa diakses oleh _renderer dan rute lainnya
  c.set('user', user as any)
  
  // 4. Lanjutkan perjalanan ke halaman yang dituju
  await next()
})
