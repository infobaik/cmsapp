import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'
import { sign } from 'hono/jwt' // IMPORT FUNGSI SIGN JWT DARI HONO

const app = new Hono()

// =======================================================
// 1. ENDPOINT KHUSUS WEB (MENGGUNAKAN SESSION COOKIE)
// =======================================================

app.post('/auth/login', async (c) => {
  const body = await c.req.parseBody()
  const email = body.email as string
  const password = body.password as string

  // 1. Validasi ke Database D1
  const query = `SELECT id, name, role FROM users WHERE email = ? AND password_hash = ?`
  // PENTING: Di aplikasi produksi nyata, selalu gunakan bcrypt untuk hash password!
  const user = await c.env.DB.prepare(query).bind(email, password).first()

  if (!user) {
    // Jika gagal, kembalikan ke halaman login dengan error
    return c.redirect('/login?error=invalid_credentials')
  }

  // 2. Buat Session ID
  const sessionId = crypto.randomUUID()
  
  // 3. Simpan sesi ke database D1 agar bisa divalidasi oleh middleware UI
  // Sesi akan valid selama 7 hari
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()
  await c.env.DB.prepare(`
    INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)
  `).bind(sessionId, user.id as number, expiresAt).run()

  // 4. Tanamkan Cookie yang sangat aman ke browser client
  setCookie(c, 'session_id', sessionId, {
    httpOnly: true, // Tidak bisa di-hack lewat Inspect Element / Console JS
    secure: true,   // Wajib HTTPS
    sameSite: 'Strict',
    maxAge: 60 * 60 * 24 * 7 // 1 Minggu
  })

  // 5. Arahkan ke dashboard user
  return c.redirect('/user/dashboard')
})

app.post('/auth/register', async (c) => {
  const body = await c.req.parseBody()
  const name = body.name as string
  const email = body.email as string
  const password = body.password as string // Idealnya di-hash menggunakan bcrypt!
  const refCodeInput = body.referral_code as string
  
  try {
    // 1. Cek apakah email sudah terdaftar
    const existingUser = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (existingUser) {
      return c.redirect('/register?error=email_sudah_digunakan')
    }

    // 2. Logika Referral: Cari ID user pengundang berdasarkan kode yang dimasukkan
    let referredById = null
    if (refCodeInput) {
      const inviter = await c.env.DB.prepare(`SELECT id FROM users WHERE referral_code = ?`).bind(refCodeInput).first()
      if (inviter) {
        referredById = inviter.id
      }
    }

    // 3. Generate kredensial unik untuk user baru
    // Generate string acak untuk API Key (digunakan bot WA/TG) dan Kode Referral pribadi
    const newApiKey = crypto.randomUUID().replace(/-/g, '') 
    const newReferralCode = crypto.randomUUID().split('-')[0].toUpperCase() // Contoh: 8A4F2C

    // 4. Masukkan data ke Database D1
    const insertQuery = `
      INSERT INTO users (name, email, password_hash, api_key, referral_code, referred_by_id, role) 
      VALUES (?, ?, ?, ?, ?, ?, 'member')
    `
    await c.env.DB.prepare(insertQuery).bind(
      name, 
      email, 
      password, 
      newApiKey, 
      newReferralCode, 
      referredById
    ).run()

    // 5. Buat dompet (wallet) kosong untuk user yang baru mendaftar
    const newUser = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (newUser) {
       await c.env.DB.prepare(`INSERT INTO wallets (user_id, balance_available, balance_pending) VALUES (?, 0, 0)`).bind(newUser.id).run()
    }

    // 6. Arahkan pengguna ke halaman login dengan pesan sukses
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
  const password = body.password as string

  const user = await c.env.DB.prepare(`SELECT id, role FROM users WHERE email = ? AND password_hash = ?`).bind(email, password).first()

  if (!user) {
    return c.json({ status: 'error', message: 'Kredensial tidak valid' }, 401)
  }

  // BUAT PAYLOAD JWT
  const payload = {
    sub: user.id, // Subject (User ID)
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // Kedaluwarsa 30 hari
  }

  // TANDATANGANI JWT SECARA EKSPLISIT DENGAN ALG HS256
  // String JWT_SECRET wajib ditambahkan ke file wrangler.toml pada bagian [vars]
  const token = await sign(payload, c.env.JWT_SECRET, 'HS256')

  return c.json({
    status: 'success',
    message: 'Login berhasil',
    token: token // Berikan JWT ke APK Android
  })
})

export default app
