import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { uploadToCloudinary } from '../../services/cloudinary'

const app = new Hono()

// ========================================================================
// MIDDLEWARE PROTEKSI
// ========================================================================
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

// ========================================================================
// 1. PENGATURAN WEBSITE 
// ========================================================================
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

// ========================================================================
// 3. MANAJEMEN KATEGORI & BRAND (DENGAN GAMBAR)
// ========================================================================
app.post('/categories/create', async (c) => {
  const body = await c.req.parseBody({ all: true })
  const name = body.name as string
  const slug = body.slug as string || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const type = body.type as string
  const parentId = body.parent_id ? parseInt(body.parent_id as string) : null
  
  const imageFile = body.image as File
  let imageUrl = null

  try {
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadToCloudinary(c.env.DB, imageFile)
    }

    await c.env.DB.prepare(`
      INSERT INTO categories (parent_id, name, slug, type, image_url) 
      VALUES (?, ?, ?, ?, ?)
    `).bind(parentId, name, slug, type, imageUrl).run()
    
    return c.redirect('/admin/categories?success=true')
  } catch (error) {
    console.error("Gagal membuat kategori:", error)
    return c.redirect('/admin/categories?error=failed')
  }
})

// ========================================================================
// 4. MANAJEMEN PRODUK 
// ========================================================================
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

// ========================================================================
// 6. MANAJEMEN PROVIDER H2H
// ========================================================================
app.post('/providers/create', async (c) => {
  const body = await c.req.parseBody()
  
  const name = body.name as string
  const apiEndpoint = body.api_endpoint as string
  const apiKey = body.api_key as string
  const apiSecret = body.api_secret as string || null
  const proxyUrl = body.proxy_url as string || null

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

// ========================================================================
// 7. VALIDASI DEPOSIT 
// ========================================================================
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

// ========================================================================
// 8. PAYMENT GATEWAY
// ========================================================================
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

// ========================================================================
// 9. BATCH SYNC PRODUK JSON (OKECONNECT & H2H) - LOGIKA ENTERPRISE
// ========================================================================
app.post('/products/sync-okeconnect', async (c) => {
  try {
    const body = await c.req.parseBody();
    const providerId = Number(body.provider_id);
    const jsonUrl = body.json_url as string;
    const defaultMargin = Number(body.profit_margin || 0);

    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error("Gagal mengambil data dari Server OkeConnect");
    
    const result = await response.json();
    const items = Array.isArray(result) ? result : (result.data || []);
    if (!items || items.length === 0) return c.redirect('/admin/products?error=Data+JSON+Kosong');

    const { results: dbCats } = await c.env.DB.prepare(`SELECT id, parent_id, name FROM categories WHERE type = 'product'`).all();
    const catNameToId = new Map(dbCats.map((c: any) => [c.name.toLowerCase(), c.id]));

    const uniqueParents = [...new Set(items.map((i: any) => i.kategori || 'Lainnya'))];
    
    for (const parentName of uniqueParents) {
      const lowerParent = String(parentName).toLowerCase();
      if (!catNameToId.has(lowerParent)) {
         const slug = lowerParent.replace(/[^a-z0-9]+/g, '-');
         const res = await c.env.DB.prepare(`INSERT INTO categories (parent_id, name, slug, type) VALUES (NULL, ?, ?, 'product') RETURNING id`).bind(parentName, slug).first();
         if (res && res.id) catNameToId.set(lowerParent, res.id as number);
      }
    }

    const uniqueBrands = [...new Set(items.map((i: any) => JSON.stringify({ parent: i.kategori || 'Lainnya', brand: i.produk || 'Umum' })))];
    
    for (const brandStr of uniqueBrands) {
      const { parent, brand } = JSON.parse(brandStr as string);
      const lowerBrand = String(brand).toLowerCase();
      
      if (!catNameToId.has(lowerBrand)) {
         const parentId = catNameToId.get(String(parent).toLowerCase());
         const slug = lowerBrand.replace(/[^a-z0-9]+/g, '-');
         const res = await c.env.DB.prepare(`INSERT INTO categories (parent_id, name, slug, type) VALUES (?, ?, ?, 'product') RETURNING id`).bind(parentId, brand, slug).first();
         if (res && res.id) catNameToId.set(lowerBrand, res.id as number);
      }
    }

    const { results: existingProducts } = await c.env.DB.prepare(`SELECT provider_product_code FROM products WHERE provider_id = ?`).bind(providerId).all();
    const existingCodeMap = new Set(existingProducts.map((p: any) => p.provider_product_code));

    const statements = [];
    const updateStmt = `UPDATE products SET price = ?, status = ?, name = ?, category_id = ?, order_type = ? WHERE provider_id = ? AND provider_product_code = ?`;
    const insertStmt = `INSERT INTO products (category_id, provider_id, provider_product_code, name, stock_type, order_type, price, status) VALUES (?, ?, ?, ?, 'general', ?, ?, ?)`;

    for (const item of items) {
      const pCode = item.kode;
      const pName = item.keterangan || item.produk || item.nama || pCode;
      const basePrice = Number(item.harga);
      
      const isCekInquiry = basePrice === 0 || pCode.toUpperCase().startsWith('INQ') || pName.toLowerCase().includes('cek ');
      const finalSellPrice = isCekInquiry ? 0 : (basePrice + defaultMargin);

      const isPostpaid = pCode.toUpperCase().startsWith('PAY') || basePrice < 0 || pName.toLowerCase().includes('bayar tagihan');
      const oType = isPostpaid ? 'postpaid' : 'prepaid';

      const pStatus = (item.status?.toLowerCase() === 'normal' || item.status === '1' || item.status === 'active') ? 'active' : 'inactive';
      const brandId = catNameToId.get(String(item.produk || 'Umum').toLowerCase());

      if (existingCodeMap.has(pCode)) {
         statements.push(c.env.DB.prepare(updateStmt).bind(finalSellPrice, pStatus, pName, brandId, oType, providerId, pCode));
      } else {
         statements.push(c.env.DB.prepare(insertStmt).bind(brandId, providerId, pCode, pName, oType, finalSellPrice, pStatus));
      }
    }

    const chunkSize = 50;
    for (let i = 0; i < statements.length; i += chunkSize) {
      const chunk = statements.slice(i, i + chunkSize);
      await c.env.DB.batch(chunk);
    }

    return c.redirect(`/admin/products?success=Berhasil+sinkronisasi+dan+pemetaan+${statements.length}+produk`);
  } catch (error: any) {
    console.error("Sync Error:", error);
    return c.redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }
})

export default app
