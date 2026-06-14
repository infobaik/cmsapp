import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'

const app = new Hono()

app.post('/auth/login', async (c) => {
  const body = await c.req.parseBody()
  const email = body.email as string
  const password = body.password as string

  // 1. Validasi ke Database D1
  const query = `SELECT id, name, role FROM users WHERE email = ? AND password_hash = ?`
  // PENTING: Di aplikasi produksi nyata, gunakan bcrypt untuk hash password!
  const user = await c.env.DB.prepare(query).bind(email, password).first()

  if (!user) {
    // Jika gagal, kembalikan ke halaman login dengan error
    return c.redirect('/login?error=invalid_credentials')
  }

  // 2. Buat Session ID (Disimulasikan dengan crypto random)
  const sessionId = crypto.randomUUID()
  
  // (Opsional) Simpan sessionId ini ke tabel 'sessions' di D1 agar bisa divalidasi oleh middleware UI

  // 3. Tanamkan Cookie yang sangat aman ke browser client
  setCookie(c, 'session_id', sessionId, {
    httpOnly: true, // Tidak bisa di-hack lewat Inspect Element / Console JS
    secure: true,   // Wajib HTTPS
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7 // 1 Minggu
  })

  // 4. Arahkan ke dashboard user
  return c.redirect('/user/dashboard')
})

export default app
