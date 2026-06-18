import { Hono } from 'hono'
import { setCookie } from 'hono/cookie'

const app = new Hono()

// Fungsi Bantuan: Hash Password
async function hashPassword(password: string) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

app.post('/auth/login', async (c) => {
  try {
    const body = await c.req.parseBody()
    const email = body.email as string
    const password = body.password as string

    const hash = await hashPassword(password)
    const user = await c.env.DB.prepare(`SELECT id, role FROM users WHERE email = ? AND password = ? AND status = 'active'`).bind(email, hash).first()

    if (!user) return c.redirect('/login?error=invalid_credentials')

    const sessionId = crypto.randomUUID()
    const expireDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const expiresAt = expireDate.toISOString().replace('T', ' ').split('.')[0]

    await c.env.DB.prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`).bind(sessionId, user.id, expiresAt).run()
    setCookie(c, 'session_id', sessionId, { path: '/', httpOnly: true, secure: true, maxAge: 7 * 24 * 60 * 60 })

    if (user.role === 'admin') return c.redirect('/admin')
    return c.redirect('/user/dashboard')
  } catch (error) {
    return c.redirect('/login?error=system_error')
  }
})

app.post('/auth/register', async (c) => {
  try {
    const body = await c.req.parseBody()
    const name = body.name as string
    const email = body.email as string
    const password = body.password as string

    const existing = await c.env.DB.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
    if (existing) return c.redirect('/register?error=email_exists')

    const hash = await hashPassword(password)
    
    // Insert User Baru
    const insertUser = await c.env.DB.prepare(`
      INSERT INTO users (name, email, password, role, status) 
      VALUES (?, ?, ?, 'member', 'active') RETURNING id
    `).bind(name, email, hash).first()

    // Buatkan Wallet Otomatis
    if (insertUser && insertUser.id) {
       await c.env.DB.prepare(`INSERT INTO wallets (user_id, balance_available, balance_held) VALUES (?, 0, 0)`).bind(insertUser.id).run()
    }

    return c.redirect('/login?success=registered')
  } catch(error) {
    return c.redirect('/register?error=system_error')
  }
})

export default app
