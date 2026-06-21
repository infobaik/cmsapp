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
// 🔥 FUNGSI UTAMA PEMBUATAN ORDER (Bisa dipanggil oleh rute manapun)
// ====================================================================
const createOrderHandler = async (c: any) => {
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

    // Arahkan halaman sesuai jenis output
    if (orderResult.type === 'prepaid') {
      return c.redirect('/user/history?success=transaksi_berhasil')
    } else {
      return c.redirect('/user/history?success=cek_tagihan_berhasil_silakan_bayar')
    }

  } catch (error: any) {
    let errMsg = error.message
    if (errMsg === 'NOMINAL_MINIMAL_1000') errMsg = 'Nominal topup minimal adalah Rp 1.000!'
    if (errMsg === 'INSUFFICIENT_BALANCE') errMsg = 'Saldo dompet Anda tidak cukup!'
    if (errMsg === 'PRODUCT_NOT_AVAILABLE') errMsg = 'Produk sedang gangguan/tidak aktif!'
    
    return c.redirect(`/user/order/${pid}?error=${encodeURIComponent(errMsg)}`)
  }
}

// 🎯 DAFTARKAN DUA URL SEKALIGUS (Anti 404!)
app.post('/order/create', createOrderHandler)
app.post('/transaction/create', createOrderHandler)


// ====================================================================
// 🔥 FUNGSI UTAMA PELUNASAN TAGIHAN PASCABAYAR
// ====================================================================
const payOrderHandler = async (c: any) => {
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
}

// 🎯 DAFTARKAN DUA URL SEKALIGUS (Anti 404!)
app.post('/order/pay', payOrderHandler)
app.post('/transaction/pay', payOrderHandler)

app.post('/wallet/deposit', async (c) => {
  try {
    const userId = c.get('ui_user_id')
    const body = await c.req.parseBody()
    const amount = Number(body.amount)

    if (amount < 10000) return c.redirect('/user/wallet?error=minimal_10000')
    
    const depositId = `DEP-${crypto.randomUUID().split('-')[0].toUpperCase()}`

    // 1. Simpan ke database dengan status pending
    await c.env.DB.prepare(`INSERT INTO deposits (id, user_id, amount, status) VALUES (?, ?, ?, 'pending')`).bind(depositId, userId, amount).run()

    // 2. Ambil Endpoint & API Key dari database (Dinamis dari Admin Area)
    const gateway = await c.env.DB.prepare(`SELECT api_endpoint, api_key FROM payment_gateways WHERE status = 'active' LIMIT 1`).first()
    
    // 3. Tembak ke API Payment Gateway secara dinamis
    if (gateway && gateway.api_endpoint && gateway.api_key) {
       const hostUrl = new URL(c.req.url).origin 
       
       const reqBody = {
           order_id: depositId,
           amount: amount,
           webhook_url: `${hostUrl}/api/webhook/qrispay`, // Targeted Webhook
           redirect_url: `${hostUrl}/user/history?success=Deposit+dibuat,+silakan+selesaikan+pembayaran`
       }

       // Format URL agar selalu akurat (jika Admin lupa menaruh '/trx' di ujung URL)
       let targetUrl = gateway.api_endpoint as string;
       if (!targetUrl.endsWith('/trx')) {
           targetUrl = targetUrl.replace(/\/$/, '') + '/trx';
       }

       // Fetch menggunakan URL dari database
       const qrisRes = await fetch(targetUrl, {
           method: 'POST',
           headers: {
               'Authorization': `Bearer ${gateway.api_key}`,
               'Content-Type': 'application/json'
           },
           body: JSON.stringify(reqBody)
       })

       if (qrisRes.ok) {
           const qrisData = await qrisRes.json()
           // Dukungan untuk berbagai format kembalian URL checkout
           const paymentUrl = qrisData.data?.checkout_url || qrisData.data?.payment_url || qrisData.checkout_url || qrisData.payment_url || qrisData.url || qrisData.redirect_url
           
           if (paymentUrl) {
               return c.redirect(paymentUrl) 
           }
       }
    }

    // Fallback jika API sedang gangguan atau Gateway belum disetting di Admin
    return c.redirect('/user/wallet?success=deposit_created_manual')
  } catch (error) {
    return c.redirect('/user/wallet?error=system_error')
  }
})

export default app
