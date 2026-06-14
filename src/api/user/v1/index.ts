import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { processPrepaidOrder } from '../../services/transaction'

const app = new Hono()

// Middleware Proteksi UI
app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  const user = await c.env.DB.prepare(`SELECT user_id FROM sessions WHERE id = ? AND expires_at > CURRENT_TIMESTAMP`).bind(sessionId).first()
  if (!user) return c.redirect('/login')

  c.set('ui_user_id', user.user_id)
  await next()
})

// --- ENDPOINT: TARIK SALDO ---
app.post('/wallet/withdraw', async (c) => {
  const userId = c.get('ui_user_id')
  const result = await c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available - 50000 WHERE user_id = ? AND balance_available >= 50000`).bind(userId).run()

  if (result.meta.changes === 0) return c.redirect('/user/wallet?error=saldo_tidak_cukup')
  return c.redirect('/user/wallet?success=penarikan_diproses')
})

// --- ENDPOINT BARU: BUAT DEPOSIT ---
app.post('/wallet/deposit', async (c) => {
  const userId = c.get('ui_user_id')
  const body = await c.req.parseBody()
  
  const amount = Number(body.amount)
  const gatewayCode = body.gateway_code as string

  if (amount < 10000) return c.redirect('/user/wallet?error=minimal_10000')

  // Generate ID Deposit unik (Contoh: DEP-12345678)
  const depositId = `DEP-${crypto.randomUUID().split('-')[0].toUpperCase()}`

  // Simpan record deposit ke D1 dengan status 'pending'
  await c.env.DB.prepare(`
    INSERT INTO deposits (id, user_id, amount, status) 
    VALUES (?, ?, ?, 'pending')
  `).bind(depositId, userId, amount).run()

  // Dalam sistem nyata, di sini Anda menembak API Gateway (seperti Midtrans/Gopay)
  // Untuk saat ini kita arahkan kembali dengan sukses
  return c.redirect('/user/wallet?success=deposit_created')
})

// --- ENDPOINT BARU: PROSES ORDER TRANSAKSI ---
app.post('/order/create', async (c) => {
  const userId = c.get('ui_user_id')
  const body = await c.req.parseBody()
  
  const productId = Number(body.product_id)
  const customerNumber = body.customer_number as string
  const idempotencyKey = crypto.randomUUID() // Cegah double order

  try {
    // Kita panggil fungsi arsitektur transaksi canggih yang sudah kita buat sebelumnya
    await processPrepaidOrder(c.env.DB, userId, productId, customerNumber, idempotencyKey)
    
    // Jika sukses, arahkan ke riwayat
    return c.redirect('/user/history?success=transaksi_berhasil')
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return c.redirect(`/user/order/${productId}?error=saldo_kurang`)
    }
    return c.redirect(`/user/order/${productId}?error=system_error`)
  }
})

export default app
