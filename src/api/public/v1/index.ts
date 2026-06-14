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

    // 5. Arahkan pengguna ke halaman login dengan pesan sukses
    return c.redirect('/login?success=pendaftaran_berhasil')
    
  } catch (error) {
    console.error("Error saat pendaftaran:", error)
    return c.redirect('/register?error=sistem_gagal')
  }
})

export default app
