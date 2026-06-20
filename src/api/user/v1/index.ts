import { Hono } from 'hono'
import { getCookie, deleteCookie } from 'hono/cookie'
import { processNewOrder, payPostpaidBill } from '../../../services/transaction'

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

// ====================================================================
// ROUTER PEMBUATAN TRANSAKSI (Prepaid, Open Amount, & Inquiry)
// ====================================================================
app.post('/order/create', async (c) => {
  let pid = ''
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    
    const productId = Number(body.product_id)
    pid = String(productId)
    const customerNumber = body.customer_number as string
    const inputAmount = Number(body.amount) || 0 // Tangkap Nominal untuk Open Amount
    const idempotencyKey = crypto.randomUUID() 

    // Serahkan SELURUH PENGECEKAN ke Service Transaksi
    const orderResult = await processNewOrder(c.env.DB, userId, productId, customerNumber, idempotencyKey, inputAmount)

    // Arahkan halaman sesuai jenis output yang dikembalikan mesin
    if (orderResult.type === 'prepaid') {
      return c.redirect('/user/history?success=transaksi_berhasil')
    } else {
      return c.redirect('/user/history?success=cek_tagihan_berhasil_silakan_bayar')
    }

  } catch (error: any) {
    // Tangkap kode eror spesifik
    let errMsg = error.message
    if (errMsg === 'NOMINAL_MINIMAL_1000') errMsg = 'Nominal topup minimal adalah Rp 1.000!'
    if (errMsg === 'INSUFFICIENT_BALANCE') errMsg = 'Saldo dompet Anda tidak cukup!'
    if (errMsg === 'PRODUCT_NOT_AVAILABLE') errMsg = 'Produk sedang gangguan/tidak aktif!'
    
    return c.redirect(`/user/order/${pid}?error=${encodeURIComponent(errMsg)}`)
  }
})

// ====================================================================
// ROUTER PEMBAYARAN TAGIHAN (Fase Kedua Pascabayar)
// ====================================================================
app.post('/order/pay', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    const trxId = body.trx_id as string

    await payPostpaidBill(c.env.DB, userId, trxId)
    return c.redirect('/user/history?success=pembayaran_tagihan_berhasil')
  } catch (error: any) {
    if (error.message === 'INSUFFICIENT_BALANCE') {
      return c.redirect(`/user/history?error=saldo_kurang`)
    }
    return c.redirect(`/user/history?error=${encodeURIComponent(error.message)}`)
  }
})

export default app
