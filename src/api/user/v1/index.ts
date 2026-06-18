import { Hono } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import { processPrepaidOrder } from '../../../services/transaction'

const app = new Hono()

// Middleware Keamanan Member
app.use('/*', async (c, next) => {
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

app.get('/logout', async (c) => {
  const sessionId = getCookie(c, 'session_id')
  if (sessionId) {
    await c.env.DB.prepare(`DELETE FROM sessions WHERE id = ?`).bind(sessionId).run()
    deleteCookie(c, 'session_id', { path: '/' })
  }
  return c.redirect('/login')
})

app.post('/wallet/withdraw', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const result = await c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available - 50000 WHERE user_id = ? AND balance_available >= 50000`).bind(userId).run()

    if (result.meta.changes === 0) return c.redirect('/user/wallet?error=saldo_tidak_cukup')
    return c.redirect('/user/wallet?success=penarikan_diproses')
  } catch (error) {
    return c.redirect('/user/wallet?error=system_error')
  }
})

app.post('/wallet/deposit', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    const amount = Number(body.amount)

    if (amount < 10000) return c.redirect('/user/wallet?error=minimal_10000')
    const depositId = `DEP-${crypto.randomUUID().split('-')[0].toUpperCase()}`

    await c.env.DB.prepare(`INSERT INTO deposits (id, user_id, amount, status) VALUES (?, ?, ?, 'pending')`).bind(depositId, userId, amount).run()
    return c.redirect('/user/wallet?success=deposit_created')
  } catch (error) {
    return c.redirect('/user/wallet?error=system_error')
  }
})

app.post('/order/create', async (c) => {
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

export default app
