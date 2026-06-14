import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'

const app = new Hono()

// Middleware untuk API Internal UI
app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  const user = await c.env.DB.prepare(`SELECT user_id FROM sessions WHERE id = ?`).bind(sessionId).first()
  if (!user) return c.redirect('/login')

  c.set('ui_user_id', user.user_id)
  await next()
})

app.post('/wallet/withdraw', async (c) => {
  const userId = c.get('ui_user_id')
  
  // Logika pengurangan saldo di D1
  // Validasi: Pastikan saldo tidak minus menggunakan operasi database yang aman
  const result = await c.env.DB.prepare(`
    UPDATE wallets 
    SET balance_available = balance_available - 50000 
    WHERE user_id = ? AND balance_available >= 50000
  `).bind(userId).run()

  if (result.meta.changes === 0) {
    return c.redirect('/user/wallet?error=saldo_tidak_cukup')
  }

  // Catat ke tabel riwayat penarikan...
  
  return c.redirect('/user/wallet?success=penarikan_diproses')
})

export default app
