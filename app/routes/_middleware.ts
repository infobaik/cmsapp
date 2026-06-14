import { createRoute } from 'honox/factory'
import { getCookie } from 'hono/cookie'

export default createRoute(async (c, next) => {
  const sessionId = getCookie(c, 'session_id')

  // Catatan: Di file service nanti kita buat fungsi getSession()
  // Untuk saat ini kita simulasikan pengecekan ke DB
  let user = null
  
  if (sessionId) {
    try {
      // Query ke D1 untuk mencari user berdasarkan sesi
      const query = `
        SELECT users.id, users.name, users.email, users.role 
        FROM users 
        JOIN sessions ON users.id = sessions.user_id 
        WHERE sessions.id = ? AND sessions.expires_at > CURRENT_TIMESTAMP
      `
      user = await c.env.DB.prepare(query).bind(sessionId).first()
    } catch (e) {
      console.error("Session DB Error:", e)
    }
  }

  // Set context 'user' agar bisa diakses oleh _renderer dan rute lainnya
  c.set('user', user as any)
  
  await next()
})
