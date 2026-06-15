import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
// PERBAIKAN MUTLAK: Path diubah menjadi ./services karena posisi file ada di src/index.ts
import { processPrepaidOrder } from './services/transaction'

const app = new Hono()

// Middleware Proteksi UI
app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  try {
    const user = await c.env.DB.prepare(`SELECT user_id FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP`).bind(sessionId).first()
    if (!user) return c.redirect('/login')

    c.set('ui_user_id', user.user_id)
    
    // PERBAIKAN: Wajib pakai return agar tidak memicu error TypeError Promise di Cloudflare
    return await next()
  } catch (error) {
    return c.redirect('/login')
  }
})

// --- ENDPOINT: TARIK SALDO ---
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

// --- ENDPOINT BARU: BUAT DEPOSIT ---
app.post('/wallet/deposit', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    
    const amount = Number(body.amount)
    const gatewayCode = body.gateway_code as string

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

// --- ENDPOINT BARU: PROSES ORDER TRANSAKSI ---
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
    // Ambil variable productId lagi dengan aman untuk redirect error
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

// PERBAIKAN: Fallback 404
// Mencegah error "Promise did not resolve" jika ada URL yang nyasar
app.all('*', (c) => {
  return c.text('Endpoint tidak ditemukan', 404)
})

export default app
