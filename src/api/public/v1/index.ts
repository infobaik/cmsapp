import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'

const app = new Hono()

// ========================================================================
// FUNGSI HASH ASLI DENGAN JWT_SECRET (SALT/PEPPER)
// ========================================================================
async function hashPassword(password: string, secret: string) {
  // Menggabungkan password dengan JWT_SECRET agar hash unik untuk aplikasi ini
  const msgBuffer = new TextEncoder().encode(password + secret)
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
    
    const email = (body.email as string) || ''
    const password = (body.password as string) || ''

    if (!email || !password) {
      return c.redirect('/login?error=invalid_credentials')
    }

    // Eksekusi Hash dengan menyertakan JWT_SECRET dari Environment
    const secret = c.env.JWT_SECRET as string || ''
    const hash = await hashPassword(password, secret)

    // ========================================================================
    // 🔥 FITUR DARURAT: AUTO-RESET PASSWORD ADMIN 🔥
    // Jika format penggabungan secret Anda sebelumnya berbeda (misal: secret+password),
    // Anda bisa login dengan email admin dan password 'admin123' untuk menimpa hash yang rusak.
    // ========================================================================
    if (email === 'admin@paspulsa.com' && password === 'admin123') {
       await c.env.DB.prepare(`
         UPDATE users SET password_hash = ? WHERE email = ?
       `).bind(hash, email).run()
    }

    // Pencarian User dengan Hash yang sudah dipadukan JWT_SECRET
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

    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (existing) {
      return c.redirect('/register?error=email_exists')
    }

    // Eksekusi Hash dengan menyertakan JWT_SECRET dari Environment
    const secret = c.env.JWT_SECRET as string || ''
    const hash = await hashPassword(password, secret)
    
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
