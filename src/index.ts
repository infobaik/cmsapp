import { Hono } from 'hono'
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { processPrepaidOrder } from './services/transaction'

const app = new Hono()

// ========================================================================
// FUNGSI BANTUAN: HASH PASSWORD (SHA-256)
// ========================================================================
async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ========================================================================
// ROUTER 1: PUBLIC API (LOGIN & REGISTER)
// ========================================================================
const publicApi = new Hono()

publicApi.post('/auth/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    const email = body.email as string
    const password = body.password as string

    const hash = await hashPassword(password)
    
    // Validasi User
    const user = await c.env.DB.prepare(`SELECT id, role FROM users WHERE email = ? AND password = ? AND status = 'active'`).bind(email, hash).first()

    if (!user) {
      return c.redirect('/login?error=invalid_credentials')
    }

    // Buat Session ID Baru
    const sessionId = crypto.randomUUID()
    // Masa aktif sesi: 7 Hari
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const expiresAt = expireDate.toISOString().replace('T', ' ').split('.')[0]

    // Simpan ke Database
    await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).bind(sessionId, user.id, expiresAt).run()

    // Tanamkan Cookie di Browser
    setCookie(c, 'session_id', sessionId, { path: '/', httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 })

    // Redirect berdasarkan Role
    if (user.role === 'admin') {
      return c.redirect('/admin')
    }
    return c.redirect('/user/dashboard')

  } catch (error) {
    console.error('Login Error:', error)
    return c.redirect('/login?error=system_error')
  }
})

publicApi.post('/auth/register', async (c) => {
  try {
    const body = await c.req.parseBody()
    const name = body.name as string
    const email = body.email as string
    const password = body.password as string

    // Cek apakah email sudah terdaftar
    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (existing) {
      return c.redirect('/register?error=email_exists')
    }

    const hash = await hashPassword(password)
    
    // Insert User Baru & Ambil ID-nya
    const insertUser = await c.env.DB.prepare(`
      INSERT INTO users (name, email, password, role, status) 
      VALUES (?, ?, ?, 'member', 'active') RETURNING id
    `).bind(name, email, hash).first()

    if (insertUser && insertUser.id) {
       // PENTING: Buatkan Dompet (Wallet) otomatis untuk user baru!
       await c.env.DB.prepare(`INSERT INTO wallets (user_id, balance_available, balance_held) VALUES (?, 0, 0)`).bind(insertUser.id).run()
    }

    return c.redirect('/login?success=registered')
  } catch(error) {
    console.error('Register Error:', error)
    return c.redirect('/register?error=system_error')
  }
})


// ========================================================================
// ROUTER 2: USER API (MEMBER AREA)
// ========================================================================
const userApi = new Hono()

// Middleware Proteksi UI
userApi.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  try {
    const user = await c.env.DB.prepare(`SELECT user_id FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP`).bind(sessionId).first()
    if (!user) {
       deleteCookie(c, 'session_id', { path: '/' })
       return c.redirect('/login')
    }

    c.set('ui_user_id', user.user_id)
    return await next()
  } catch (error) {
    return c.redirect('/login')
  }
})

// --- ENDPOINT: LOGOUT ---
userApi.get('/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run()
    deleteCookie(c, 'session_id', { path: '/' })
  }
  return c.redirect('/login')
})

// --- ENDPOINT: TARIK SALDO ---
userApi.post('/wallet/withdraw', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const result = await c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available - 50000 WHERE user_id = ? AND balance_available >= 50000`).bind(userId).run()

    if (result.meta.changes === 0) return c.redirect('/user/wallet?error=saldo_tidak_cukup')
    return c.redirect('/user/wallet?success=penarikan_diproses')
  } catch (error) {
    return c.redirect('/user/wallet?error=system_error')
  }
})

// --- ENDPOINT: BUAT DEPOSIT ---
userApi.post('/wallet/deposit', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    
    const amount = Number(body.amount)

    if (amount < 10000) return c.redirect('/user/wallet?error=minimal_10000')

    const depositId = `DEP-${crypto.randomUUID().split('-')[0].toUpperCase()}`

    await c.env.DB.prepare(`
      INSERT INTO deposits (id, user_id, amount, status) 
      VALUES (?, ?, ?, 'pending')
    `).bind(depositId, userId, amount).run()

    return c.redirect('/user/wallet?success=deposit_created')
  } catch (error) {
    return c.redirect('/user/wallet?error=system_error')
  }
})

// --- ENDPOINT: PROSES ORDER TRANSAKSI ---
userApi.post('/order/create', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    
    const productId = Number(body.product_id)
    const customerNumber = body.customer_number as string
    const idempotencyKey = crypto.randomUUID() 

    await processPrepaidOrder(c.env.DB, userId, productId, customerNumber, idempotencyKey)
    return c.redirect('/user/history?success=transaksi_berhasil')

  } catch (error: any) {
    let pid = ''
    try {
      const b = await c.req.parseBody()
      pid = String(b.product_id)
    } catch(e) {}

    if (error.message === 'INSUFFICIENT_BALANCE') {
      return c.redirect(`/user/order/${pid}?error=saldo_kurang`)
    }
    return c.redirect(`/user/order/${pid}?error=system_error`)
  }
})

// ========================================================================
// 3. REGISTRASI SEMUA SUB-ROUTER KE APLIKASI UTAMA
// ========================================================================
app.route('/api/public/v1', publicApi)
app.route('/api/user/v1', userApi)

// Fallback 404 (Mencegah error Promise dari Cloudflare)
app.all('*', (c) => {
  return c.text('Endpoint tidak ditemukan', 404)
})

export default app
