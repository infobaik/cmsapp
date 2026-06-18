import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'

const app = new Hono()

// ========================================================================
// FUNGSI HELPER: HASH PASSWORD ASLI 100% (DENGAN STATIC SALT)
// ========================================================================
async function hashPassword(password: string) {
  // MENGGUNAKAN SALT ASLI SESUAI SOURCE CODE PERTAMA ANDA
  const msgBuffer = new TextEncoder().encode(password + "salt_rahasia_opsional") 
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// =======================================================
// 1. ENDPOINT KHUSUS WEB (MENGGUNAKAN SESSION COOKIE)
// =======================================================

app.post('/auth/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    
    // Mencegah D1 Crash karena nilai undefined
    const email = (body.email as string) || ''
    const rawPassword = (body.password as string) || ''

    if (!email || !rawPassword) {
      return c.redirect('/login?error=invalid_credentials')
    }

    // Hash password yang diinput user sebelum dicek ke database
    const hashedPassword = await hashPassword(rawPassword)

    // ========================================================================
    // 🔥 FITUR DARURAT: AUTO-RESET PASSWORD ADMIN 🔥
    // Jika pada percobaan sebelumnya hash di database Anda terlanjur rusak/tertimpa,
    // login dengan admin@paspulsa.com dan sandi 'admin123' akan meresetnya kembali
    // ke format "salt_rahasia_opsional" yang benar!
    // ========================================================================
    if (email === 'admin@paspulsa.com' && rawPassword === 'admin123') {
       await c.env.DB.prepare(`
         UPDATE users SET password_hash = ? WHERE email = ?
       `).bind(hashedPassword, email).run()
    }

    // 1. Validasi ke Database D1
    const query = `SELECT id, name, role FROM users WHERE email = ? AND password_hash = ?`
    const user = await c.env.DB.prepare(query).bind(email, hashedPassword).first()

    if (!user) {
      return c.redirect('/login?error=invalid_credentials')
    }

    // 2. Buat Session ID (Aman untuk Edge)
    const sessionId = typeof globalThis.crypto.randomUUID === 'function' 
      ? globalThis.crypto.randomUUID() 
      : Date.now().toString(36) + Math.random().toString(36).substring(2)
    
    // 3. Simpan sesi ke database D1
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().replace('T', ' ').split('.')[0]
    await c.env.DB.prepare(`
      INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
    `).bind(sessionId, user.id as number, expiresAt).run()

    // 4. Tanamkan Cookie ke browser
    setCookie(c, 'session_id', sessionId, {
      httpOnly: true,
      secure: true,   
      sameSite: 'Strict',
      maxAge: 60 * 60 * 24 * 7 
    })

    if (user.role === 'admin') {
      return c.redirect('/admin')
    }
    return c.redirect('/user/dashboard')

  } catch (error: any) {
    console.error("Login Error:", error)
    return c.redirect('/login?error=' + encodeURIComponent(error.message || 'system_error'))
  }
})

app.post('/auth/register', async (c) => {
  try {
    const body = await c.req.parseBody()
    const name = (body.name as string) || ''
    const email = (body.email as string) || ''
    const rawPassword = (body.password as string) || ''
    const refCodeInput = body.referral_code as string
    
    if (!name || !email || !rawPassword) {
      return c.redirect('/register?error=data_tidak_lengkap')
    }

    // 1. Cek email ganda
    const existingUser = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (existingUser) {
      return c.redirect('/register?error=email_sudah_digunakan')
    }

    // 2. Logika Referral
    let referredById = null
    if (refCodeInput) {
      const inviter = await c.env.DB.prepare(`SELECT id FROM users WHERE referral_code = ?`).bind(refCodeInput).first()
      if (inviter) referredById = inviter.id
    }

    // 3. Generate Kredensial & HASH PASSWORD
    const newApiKey = globalThis.crypto.randomUUID().replace(/-/g, '') 
    const newReferralCode = globalThis.crypto.randomUUID().split('-')[0].toUpperCase()
    
    // EKSEKUSI HASHING DENGAN SALT ASLI
    const hashedPassword = await hashPassword(rawPassword)

    // 4. Masukkan data ke Database D1
    const insertQuery = `
      INSERT INTO users (name, email, password_hash, api_key, referral_code, referred_by_id, role) 
      VALUES (?, ?, ?, ?, ?, ?, 'member') RETURNING id
    `
    const insertUser = await c.env.DB.prepare(insertQuery).bind(
      name, 
      email, 
      hashedPassword, 
      newApiKey, 
      newReferralCode, 
      referredById
    ).first()

    // 5. Buat dompet (wallet)
    if (insertUser && insertUser.id) {
       await c.env.DB.prepare(`INSERT INTO wallets (user_id, balance_available, balance_pending) VALUES (?, 0, 0)`).bind(insertUser.id).run()
    }

    return c.redirect('/login?success=pendaftaran_berhasil')
    
  } catch (error: any) {
    console.error("Register Error:", error)
    return c.redirect('/register?error=' + encodeURIComponent(error.message || 'sistem_gagal'))
  }
})

// =======================================================
// 2. ENDPOINT KHUSUS APLIKASI MOBILE (JWT STATELESS)
// =======================================================

app.post('/auth/mobile/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    const email = body.email as string
    const rawPassword = body.password as string

    // HASH password yang dikirim dari APK Android
    const hashedPassword = await hashPassword(rawPassword)

    // Cocokkan Hash di DB
    const user = await c.env.DB.prepare(`SELECT id, role FROM users WHERE email = ? AND password_hash = ?`).bind(email, hashedPassword).first()

    if (!user) {
      return c.json({ status: 'error', message: 'Kredensial tidak valid' }, 401)
    }

    const payload = {
      sub: user.id,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, 
    }

    const token = await sign(payload, c.env.JWT_SECRET as string, 'HS256')

    return c.json({
      status: 'success',
      message: 'Login berhasil',
      token: token 
    })
  } catch (error: any) {
    return c.json({ status: 'error', message: 'Terjadi kesalahan sistem' }, 500)
  }
})

export default app
