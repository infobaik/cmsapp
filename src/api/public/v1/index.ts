import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt'

const app = new Hono()

// --- FUNGSI HELPER: HASH PASSWORD (NATIVE WEB CRYPTO API) ---
// Sangat cepat dan ringan untuk arsitektur Serverless / Cloudflare
async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password + "salt_rahasia_opsional") // Tambahkan salt statis jika perlu
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// =======================================================
// 1. ENDPOINT KHUSUS WEB (MENGGUNAKAN SESSION COOKIE)
// =======================================================

app.post('/auth/login', async (c) => {
  const body = await c.req.parseBody()
  const email = body.email as string
  const rawPassword = body.password as string

  // HASH password yang diinput user sebelum dicek ke database
  const hashedPassword = await hashPassword(rawPassword)

  // 1. Validasi ke Database D1
  const query = `SELECT id, name, role FROM users WHERE email = ? AND password_hash = ?`
  const user = await c.env.DB.prepare(query).bind(email, hashedPassword).first()

  if (!user) {
    return c.redirect('/login?error=invalid_credentials')
  }

  // 2. Buat Session ID
  const sessionId = crypto.randomUUID()
  
  // 3. Simpan sesi ke database D1
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
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

  return c.redirect('/user/dashboard')
})

app.post('/auth/register', async (c) => {
  const body = await c.req.parseBody()
  const name = body.name as string
  const email = body.email as string
  const rawPassword = body.password as string 
  const refCodeInput = body.referral_code as string
  
  try {
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
    const newApiKey = crypto.randomUUID().replace(/-/g, '') 
    const newReferralCode = crypto.randomUUID().split('-')[0].toUpperCase()
    
    // EKSEKUSI HASHING DISINI
    const hashedPassword = await hashPassword(rawPassword)

    // 4. Masukkan data ke Database D1
    const insertQuery = `
      INSERT INTO users (name, email, password_hash, api_key, referral_code, referred_by_id, role) 
      VALUES (?, ?, ?, ?, ?, ?, 'member')
    `
    await c.env.DB.prepare(insertQuery).bind(
      name, 
      email, 
      hashedPassword, // Simpan versi Hash, bukan raw text!
      newApiKey, 
      newReferralCode, 
      referredById
    ).run()

    // 5. Buat dompet (wallet)
    const newUser = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (newUser) {
       await c.env.DB.prepare(`INSERT INTO wallets (user_id, balance_available, balance_pending) VALUES (?, 0, 0)`).bind(newUser.id).run()
    }

    return c.redirect('/login?success=pendaftaran_berhasil')
    
  } catch (error) {
    console.error("Error saat pendaftaran:", error)
    return c.redirect('/register?error=sistem_gagal')
  }
})

// =======================================================
// 2. ENDPOINT KHUSUS APLIKASI MOBILE (JWT STATELESS)
// =======================================================

app.post('/auth/mobile/login', async (c) => {
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

  // TANDATANGANI JWT SECARA EKSPLISIT DENGAN ALG HS256
  const token = await sign(payload, c.env.JWT_SECRET, 'HS256')

  return c.json({
    status: 'success',
    message: 'Login berhasil',
    token: token 
  })
})

export default app
