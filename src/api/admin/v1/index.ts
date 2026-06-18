import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { uploadToCloudinary } from '../../../services/cloudinary'

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
  const siteConfig = { siteName: body.siteName, siteDescription: body.siteDescription, themeColor: body.themeColor }
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
    const stmt = c.env.DB.prepare(`
      INSERT INTO system_settings (key, value) 
      VALUES (?, ?) 
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `)
    const batch = []
    for (const [key, value] of Object.entries(body)) {
        batch.push(stmt.bind(key, value as string)) 
    }
    if (batch.length > 0) await c.env.DB.batch(batch)
    return c.redirect('/admin/settings?success=system_updated')
  } catch (error) {
    return c.redirect('/admin/settings?error=system_failed')
  }
})

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
    return c.redirect('/admin/categories?error=failed')
  }
})

app.post('/categories/:id/update', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.parseBody({ all: true })
  
  const name = body.name as string
  const slug = body.slug as string || name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const type = body.type as string
  const parentId = body.parent_id ? parseInt(body.parent_id as string) : null
  
  const imageFile = body.image as File

  try {
    if (imageFile && imageFile.size > 0) {
      const imageUrl = await uploadToCloudinary(c.env.DB, imageFile)
      await c.env.DB.prepare(`
        UPDATE categories 
        SET parent_id = ?, name = ?, slug = ?, type = ?, image_url = ? 
        WHERE id = ?
      `).bind(parentId, name, slug, type, imageUrl, id).run()
    } else {
      await c.env.DB.prepare(`
        UPDATE categories 
        SET parent_id = ?, name = ?, slug = ?, type = ? 
        WHERE id = ?
      `).bind(parentId, name, slug, type, id).run()
    }
    return c.redirect(`/admin/categories?success=updated`)
  } catch (error: any) {
    return c.redirect(`/admin/categories/${id}?error=failed`)
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

// ========================================================================
// MESIN SYNC "KEBAL ERROR" DENGAN UPSERT (ANTI-UNIQUE CONSTRAINT)
// ========================================================================
app.post('/products/sync-okeconnect', async (c) => {
  try {
    const body = await c.req.parseBody();
    const providerId = Number(body.provider_id);
    const jsonUrl = body.json_url as string;
    const defaultMargin = Number(body.profit_margin || 0);

    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error("Gagal mengambil data JSON");
    
    const result = await response.json();
    const items = Array.isArray(result) ? result : (result.data || []);
    if (!items || items.length === 0) return c.redirect('/admin/products?error=Data+JSON+Kosong');

    // PERBAIKAN: Hapus filter type = 'product' karena kolom type sudah kita buang dari schema
    let dbCatsResult = await c.env.DB.prepare(`SELECT id, slug FROM categories`).all();
    let slugToId = new Map(dbCatsResult.results.map((c: any) => [c.slug, c.id]));

    // 1. Eksekusi Kategori Induk Aman
    const uniqueParents = [...new Set(items.map((i: any) => i.kategori || 'Lainnya'))];
    let parentStatements = [];
    for (const parent of uniqueParents) {
      const slug = String(parent).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!slugToId.has(slug)) {
         // PERBAIKAN: Insert tanpa kolom type
         parentStatements.push(c.env.DB.prepare(`INSERT INTO categories (parent_id, name, slug) VALUES (NULL, ?, ?) ON CONFLICT(slug) DO NOTHING`).bind(parent, slug));
         slugToId.set(slug, -1); 
      }
    }
    for (let i = 0; i < parentStatements.length; i += 50) {
      await c.env.DB.batch(parentStatements.slice(i, i + 50));
    }

    if (parentStatements.length > 0) {
      dbCatsResult = await c.env.DB.prepare(`SELECT id, slug FROM categories`).all();
      slugToId = new Map(dbCatsResult.results.map((c: any) => [c.slug, c.id]));
    }

    // 2. Eksekusi Brand/Sub-Kategori Aman
    const uniqueBrands = [...new Set(items.map((i: any) => JSON.stringify({ parent: i.kategori || 'Lainnya', brand: i.produk || 'Umum' })))];
    let brandStatements = [];
    for (const brandStr of uniqueBrands) {
      const { parent, brand } = JSON.parse(brandStr as string);
      const parentSlug = String(parent).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const brandSlug = String(brand).toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      if (!slugToId.has(brandSlug)) {
         const parentId = slugToId.get(parentSlug);
         // PERBAIKAN: Insert tanpa kolom type
         brandStatements.push(c.env.DB.prepare(`INSERT INTO categories (parent_id, name, slug) VALUES (?, ?, ?) ON CONFLICT(slug) DO NOTHING`).bind(parentId, brand, brandSlug));
         slugToId.set(brandSlug, -1);
      }
    }
    for (let i = 0; i < brandStatements.length; i += 50) {
      await c.env.DB.batch(brandStatements.slice(i, i + 50));
    }

    if (brandStatements.length > 0) {
      dbCatsResult = await c.env.DB.prepare(`SELECT id, slug FROM categories`).all();
      slugToId = new Map(dbCatsResult.results.map((c: any) => [c.slug, c.id]));
    }

    // 3. EKSEKUSI PRODUK: UPSERT KUNCI GANDA MUTLAK
    // PERBAIKAN: Menambahkan description, is_visible, provider_status.
    // Catatan: Kolom `status` utama tidak di-update pada konflik agar setelan admin tidak tertimpa!
    const upsertStmt = `
      INSERT INTO products (category_id, provider_id, provider_product_code, name, description, stock_type, order_type, price, status, provider_status, is_visible) 
      VALUES (?, ?, ?, ?, ?, 'general', ?, ?, 'active', ?, ?)
      ON CONFLICT(provider_id, provider_product_code) DO UPDATE SET 
        price = excluded.price, 
        provider_status = excluded.provider_status, 
        name = excluded.name,
        description = excluded.description,
        order_type = excluded.order_type,
        is_visible = excluded.is_visible
    `;

    const statements = [];
    for (const item of items) {
      const pCode = item.kode;
      const pName = item.keterangan || item.produk || item.nama || pCode;
      const pDesc = item.keterangan || '';
      const basePrice = Number(item.harga);
      
      // LOGIKA PEMISAHAN PREPAID/POSTPAID & INQUIRY
      let oType = 'prepaid';
      let finalSellPrice = 0;
      let isVis = 1;

      if (basePrice === 0 || pCode.toUpperCase().startsWith('INQ')) {
        // Produk Cek Tagihan
        oType = 'inquiry';
        finalSellPrice = 0; // Cek tagihan selalu murni Rp 0
        isVis = 1;
      } else if (basePrice < 0 || pCode.toUpperCase().startsWith('PAY')) {
        // Produk Eksekusi Bayar Tagihan (POSTPAID)
        oType = 'postpaid';
        // PERBAIKAN: Rumus ajaib Anda diterapkan di sini! 
        // Contoh: -3000 (Komisi Asli) + 500 (Margin) = -2500 (Komisi untuk User)
        finalSellPrice = basePrice + defaultMargin; 
        isVis = 0; // Sembunyikan dari katalog!
      } else {
        // Produk Prabayar Umum (Pulsa, Game, Data)
        oType = 'prepaid';
        // Contoh: 10000 (Harga Asli) + 500 (Margin) = 10500 (Harga User)
        finalSellPrice = basePrice + defaultMargin;
        isVis = 1;
      }
      
      const pProvStatus = (item.status === '1' || item.status === 'normal') ? 'active' : 'inactive';
      
      // Ambil ID Brand dari Map
      const brandSlug = String(item.produk || 'Umum').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const brandId = slugToId.get(brandSlug);

      statements.push(c.env.DB.prepare(upsertStmt).bind(
          brandId, providerId, pCode, pName, pDesc, oType, finalSellPrice, pProvStatus, isVis
      ));
    }

    for (let i = 0; i < statements.length; i += 50) {
      await c.env.DB.batch(statements.slice(i, i + 50));
    }

    return c.redirect(`/admin/products?success=Sinkronisasi+Sukses+${statements.length}+Produk`);
  } catch (error: any) {
    return c.redirect(`/admin/products?error=${encodeURIComponent(error.message)}`);
  }
})
export default app
