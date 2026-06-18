import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'

const app = new Hono()

// Fungsi Bantuan: Hash Password (Sesuai dengan log data Anda)
async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ========================================================================
// ENDPOINT: LOGIN
// ========================================================================
app.post('/auth/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    
    // Mencegah D1 Crash karena nilai undefined
    const email = (body.email as string) || ''
    const password = (body.password as string) || ''

    if (!email || !password) {
      return c.redirect('/login?error=invalid_credentials')
    }

    const hash = await hashPassword(password)

    // PERBAIKAN MUTLAK: Mencocokkan dengan kolom "password_hash" persis seperti di schema.sql.
    // Menghapus pengecekan "status" karena memang tidak ada di tabel users.
    const user = await c.env.DB.prepare(`
      SELECT id, role FROM users 
      WHERE email = ? AND password_hash = ?
    `).bind(email, hash).first()

    if (!user) {
      return c.redirect('/login?error=invalid_credentials')
    }

    // Generate Session ID
    const sessionId = crypto.randomUUID()
    
    // Set waktu kedaluwarsa 7 Hari
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const expiresAt = expireDate.toISOString().replace('T', ' ').split('.')[0]

    // Simpan ke Tabel Sessions
    await c.env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
    `).bind(sessionId, user.id, expiresAt).run()

    // Tanamkan Cookie
    setCookie(c, 'session_id', sessionId, { path: '/', httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 })

    // Redirect berdasarkan Role
    if (user.role === 'admin') {
      return c.redirect('/admin')
    }
    return c.redirect('/user/dashboard')

  } catch (error: any) {
    console.error('Login Fatal Error:', error)
    return c.redirect('/login?error=' + encodeURIComponent(error.message || 'system_error_unknown'))
  }
})

// ========================================================================
// ENDPOINT: DAFTAR (REGISTER)
// ========================================================================
app.post('/auth/register', async (c) => {
  try {
    const body = await c.req.parseBody()
    
    const name = (body.name as string) || ''
    const email = (body.email as string) || ''
    const password = (body.password as string) || ''

    if (!name || !email || !password) {
      return c.redirect('/register?error=data_tidak_lengkap')
    }

    // Cek apakah email sudah terdaftar
    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (existing) {
      return c.redirect('/register?error=email_exists')
    }

    const hash = await hashPassword(password)
    
    // PERBAIKAN MUTLAK: Menggunakan kolom "password_hash" dan menghapus "status" sesuai schema.sql.
    const insertUser = await c.env.DB.prepare(`
      INSERT INTO users (name, email, password_hash, role) 
      VALUES (?, ?, ?, 'member') RETURNING id
    `).bind(name, email, hash).first()

    // Buatkan Dompet (Wallet) otomatis untuk user baru
    if (insertUser && insertUser.id) {
       await c.env.DB.prepare(`
         INSERT INTO wallets (user_id, balance_available, balance_pending) 
         VALUES (?, 0.0, 0.0)
       `).bind(insertUser.id).run()
    }

    return c.redirect('/login?success=registered')
  } catch(error: any) {
    console.error('Register Fatal Error:', error)
    return c.redirect('/register?error=' + encodeURIComponent(error.message || 'system_error_unknown'))
  }
})

export default app
