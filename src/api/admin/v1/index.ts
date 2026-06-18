import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { uploadToCloudinary } from '../../services/cloudinary'

const app = new Hono()

app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  const user = await c.env.DB.prepare(`
    SELECT u.id, u.role FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(sessionId).first()

  if (!user || user.role !== 'admin') {
    return c.redirect('/login')
  }

  c.set('admin_user_id', user.id)
  return await next()
})

app.post('/settings/update', async (c) => {
  const body = await c.req.parseBody()
  const siteConfig = {
    siteName: body.siteName,
    siteDescription: body.siteDescription,
    themeColor: body.themeColor
  }
  try {
    await c.env.SITE_KV.put('site_settings', JSON.stringify(siteConfig))
    return c.redirect('/admin/settings?success=true')
  } catch (error) {
    return c.redirect('/admin/settings?error=failed')
  }
})

app.post('/system/update', async (c) => {
  const body = await c.req.parseBody()
  try {
    const stmt = c.env.DB.prepare(`UPDATE system_settings SET value = ? WHERE key = ?`)
    const batch = []
    for (const [key, value] of Object.entries(body)) {
        batch.push(stmt.bind(value as string, key))
    }
    if (batch.length > 0) await c.env.DB.batch(batch)
    return c.redirect('/admin/settings?success=system_updated')
  } catch (error) {
    return c.redirect('/admin/settings?error=system_failed')
  }
})

app.post('/categories/create', async (c) => {
  const body = await c.req.parseBody()
  const name = body.name as string
  const slug = body.slug as string || name.toLowerCase().replace(/ /g, '-')
  const type = body.type as string
  const parentId = body.parent_id ? parseInt(body.parent_id as string) : null

  try {
    await c.env.DB.prepare(`
      INSERT INTO categories (parent_id, name, slug, type) 
      VALUES (?, ?, ?, ?)
    `).bind(parentId, name, slug, type).run()
    return c.redirect('/admin/categories?success=true')
  } catch (error) {
    return c.redirect('/admin/categories?error=failed')
  }
})

app.post('/products/create', async (c) => {
  const body = await c.req.parseBody({ all: true })
  
  const name = body.name as string
  const categoryId = parseInt(body.category_id as string)
  const providerId = parseInt(body.provider_id as string)
  const providerProductCode = body.provider_product_code as string
  const stockType = body.stock_type as string
  const orderType = body.order_type as string
  const price = parseFloat(body.price as string)
  
  const imageFile = body.image as File
  let imageUrl = null

  try {
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadToCloudinary(c.env.DB, imageFile)
    }

    await c.env.DB.prepare(`
      INSERT INTO products (category_id, provider_id, provider_product_code, name, stock_type, order_type, price, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(categoryId, providerId, providerProductCode, name, stockType, orderType, price, imageUrl).run()

    return c.redirect('/admin/products?success=true')
  } catch (error: any) {
    return c.redirect(`/admin/products?error=${encodeURIComponent(error.message)}`)
  }
})

app.post('/products/:id/update', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.parseBody({ all: true })
  
  const name = body.name as string
  const categoryId = parseInt(body.category_id as string)
  const stockType = body.stock_type as string
  const orderType = body.order_type as string
  const price = parseFloat(body.price as string)
  const status = body.status as string
  
  const imageFile = body.image as File

  try {
    if (imageFile && imageFile.size > 0) {
      const imageUrl = await uploadToCloudinary(c.env.DB, imageFile)
      await c.env.DB.prepare(`
        UPDATE products 
        SET category_id = ?, name = ?, stock_type = ?, order_type = ?, price = ?, status = ?, image_url = ? 
        WHERE id = ?
      `).bind(categoryId, name, stockType, orderType, price, status, imageUrl, id).run()
    } else {
      await c.env.DB.prepare(`
        UPDATE products 
        SET category_id = ?, name = ?, stock_type = ?, order_type = ?, price = ?, status = ? 
        WHERE id = ?
      `).bind(categoryId, name, stockType, orderType, price, status, id).run()
    }
    return c.redirect(`/admin/products/${id}?success=true`)
  } catch (error: any) {
    return c.redirect(`/admin/products/${id}?error=${encodeURIComponent(error.message)}`)
  }
})

app.post('/providers/create', async (c) => {
  const body = await c.req.parseBody()
  
  const name = body.name as string
  const apiEndpoint = body.api_endpoint as string
  const apiKey = body.api_key as string
  const apiSecret = body.api_secret as string || null
  const proxyUrl = body.proxy_url as string || null // TANGKAP PROXY

  try {
    await c.env.DB.prepare(`
      INSERT INTO providers (name, api_endpoint, api_key, api_secret, proxy_url, status)
      VALUES (?, ?, ?, ?, ?, 'active')
    `).bind(name, apiEndpoint, apiKey, apiSecret, proxyUrl).run()

    return c.redirect('/admin/providers?success=true')
  } catch (error: any) {
    return c.redirect(`/admin/providers?error=failed`)
  }
})

app.post('/deposits/:id/approve', async (c) => {
  const depositId = c.req.param('id')
  try {
    const deposit = await c.env.DB.prepare(`SELECT user_id, amount FROM deposits WHERE id = ? AND status = 'pending'`).bind(depositId).first()
    if (!deposit) return c.redirect('/admin/deposits?error=not_found')

    await c.env.DB.batch([
      c.env.DB.prepare(`UPDATE deposits SET status = 'success' WHERE id = ?`).bind(depositId),
      c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(deposit.amount, deposit.user_id)
    ])
    return c.redirect('/admin/deposits?success=approved')
  } catch (error) {
    return c.redirect('/admin/deposits?error=system_failed')
  }
})

app.post('/deposits/:id/reject', async (c) => {
  const depositId = c.req.param('id')
  try {
    await c.env.DB.prepare(`UPDATE deposits SET status = 'failed' WHERE id = ? AND status = 'pending'`).bind(depositId).run()
    return c.redirect('/admin/deposits?success=rejected')
  } catch (error) {
    return c.redirect('/admin/deposits?error=system_failed')
  }
})

app.post('/gateways/create', async (c) => {
  const body = await c.req.parseBody()
  const name = body.name as string
  const code = body.code as string
  const apiKey = body.api_key as string
  const apiSecret = body.api_secret as string || null

  try {
    await c.env.DB.prepare(`
      INSERT INTO payment_gateways (name, code, api_key, api_secret, status)
      VALUES (?, ?, ?, ?, 'active')
    `).bind(name, code, apiKey, apiSecret).run()
    return c.redirect('/admin/gateways?success=true')
  } catch (error: any) {
    return c.redirect(`/admin/gateways?error=failed`)
  }
})

export default app
