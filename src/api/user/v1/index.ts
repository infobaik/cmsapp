import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { dispatchProviderOrder } from '../../../services/providers/index'

const app = new Hono()

app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  try {
    const user = await c.env.DB.prepare(`
      SELECT u.id FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
    `).bind(sessionId).first()

    if (!user) return c.redirect('/login')

    c.set('user_id', user.id)
    return await next()
  } catch (error) {
    return c.redirect('/login')
  }
})

app.post('/order/create', async (c) => {
  try {
    const userId = c.get('user_id')
    const body = await c.req.parseBody()

    const productId = parseInt(body.product_id as string)
    const customerNumber = body.customer_number as string

    // SELECT PROXY_URL DARI DATABASE
    const product = await c.env.DB.prepare(`
      SELECT p.*, pr.name as provider_name, pr.api_endpoint, pr.api_key, pr.api_secret, pr.proxy_url
      FROM products p
      JOIN providers pr ON p.provider_id = pr.id
      WHERE p.id = ? AND p.status = 'active'
    `).bind(productId).first()

    if (!product) {
      return c.redirect('/user/dashboard?error=Produk+tidak+tersedia+atau+sedang+gangguan')
    }

    const price = Number(product.price)
    const trxId = 'TRX-' + Date.now() + '-' + Math.floor(Math.random() * 1000)

    const deduct = await c.env.DB.prepare(`
      UPDATE wallets
      SET balance_available = balance_available - ?
      WHERE user_id = ? AND balance_available >= ?
      RETURNING id
    `).bind(price, userId, price).first()

    if (!deduct) return c.redirect('/user/dashboard?error=Saldo+tidak+mencukupi')

    await c.env.DB.prepare(`
      INSERT INTO transactions (id, user_id, product_id, customer_number, order_type, total_price, status, idempotency_key)
      VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)
    `).bind(trxId, userId, productId, customerNumber, product.order_type, price, trxId).run()

    try {
      // INJEKSIKAN PROXY URL KE CREDENTIALS
      const providerCreds = {
        endpoint: product.api_endpoint,
        key: product.api_key,
        secret: product.api_secret,
        proxy_url: product.proxy_url 
      }

      const orderResult = await dispatchProviderOrder(
        product.provider_name as string,
        'payment', 
        providerCreds,
        product.provider_product_code as string,
        customerNumber,
        trxId
      )

      let finalStatus = 'processing' 
      const provData = orderResult.raw_response?.data

      if (provData?.status === 'Sukses') {
         finalStatus = 'success'
      } else if (provData?.status === 'Gagal') {
         finalStatus = 'failed'
      }

      await c.env.DB.prepare(`
        UPDATE transactions
        SET status = ?, provider_response = ?
        WHERE id = ?
      `).bind(finalStatus, JSON.stringify(orderResult.raw_response), trxId).run()

      if (finalStatus === 'failed') {
        await c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(price, userId).run()
        return c.redirect(`/user/order/${trxId}?error=Transaksi+Gagal+oleh+Provider.+Dana+telah+di-refund.`)
      }

      return c.redirect(`/user/order/${trxId}?success=true`)

    } catch (providerError: any) {
      const rawErrorText = providerError.message || String(providerError)
      await c.env.DB.batch([
        c.env.DB.prepare(`UPDATE transactions SET status = 'failed', provider_response = ? WHERE id = ?`).bind(rawErrorText, trxId),
        c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(price, userId)
      ])
      return c.redirect(`/user/order/${trxId}?error=Transaksi+Gagal.+Saldo+telah+dikembalikan.`)
    }
  } catch (systemError: any) {
    return c.redirect('/user/dashboard?error=Terjadi+kesalahan+sistem')
  }
})

export default app
