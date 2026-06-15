import { Hono } from 'hono'
import { getCookie } from 'hono/cookie'
import { uploadToCloudinary } from '../../../services/cloudinary'

const app = new Hono()

// ========================================================================
// MIDDLEWARE PROTEKSI: HANYA ADMIN YANG BOLEH MENGEKSEKUSI API INI
// ========================================================================
app.use('/*', async (c, next) => {
  const sessionId = getCookie(c, 'session_id')
  if (!sessionId) return c.redirect('/login')

  const user = await c.env.DB.prepare(`
    SELECT u.id, u.role FROM sessions s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.id = ? AND s.expires_at > CURRENT_TIMESTAMP
  `).bind(sessionId).first()

  // Jika sesi tidak valid atau role bukan admin, tendang keluar
  if (!user || user.role !== 'admin') {
    return c.redirect('/login')
  }

  // Simpan ID admin di context untuk log audit jika diperlukan
  c.set('admin_user_id', user.id)
  await next()
})

// ========================================================================
// 1. PENGATURAN WEBSITE (DISIMPAN CEPAT KE CLOUDFLARE KV)
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
    console.error("Gagal menyimpan ke KV:", error)
    return c.redirect('/admin/settings?error=failed')
  }
})

// ========================================================================
// 2. PENGATURAN SISTEM RAHASIA (DISIMPAN KE D1)
// ========================================================================
app.post('/system/update', async (c) => {
  const body = await c.req.parseBody()
  
  try {
    const stmt = c.env.DB.prepare(`UPDATE system_settings SET value = ? WHERE key = ?`)
    const batch = []
    
    // Loop semua input form dan jadikan batch update
    for (const [key, value] of Object.entries(body)) {
        batch.push(stmt.bind(value as string, key))
    }
    
    if (batch.length > 0) {
      await c.env.DB.batch(batch)
    }
    
    return c.redirect('/admin/settings?success=system_updated')
  } catch (error) {
    console.error("Gagal update system_settings:", error)
    return c.redirect('/admin/settings?error=system_failed')
  }
})

// ========================================================================
// 3. MANAJEMEN KATEGORI & LABEL
// ========================================================================
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
    console.error("Gagal membuat kategori:", error)
    return c.redirect('/admin/categories?error=failed')
  }
})

// UPDATE KATEGORI & UPLOAD ICON
app.post('/categories/:id/update', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.parseBody({ all: true }) // Mendukung file upload
  
  const name = body.name as string
  const slug = body.slug as string
  const type = body.type as string
  const parentId = body.parent_id ? parseInt(body.parent_id as string) : null
  
  const iconFile = body.icon as File

  try {
    if (iconFile && iconFile.size > 0) {
      // Jika ada file icon baru yang diupload
      const imageUrl = await uploadToCloudinary(c.env.DB, iconFile)
      
      await c.env.DB.prepare(`
        UPDATE categories 
        SET name = ?, slug = ?, type = ?, parent_id = ?, image_url = ? 
        WHERE id = ?
      `).bind(name, slug, type, parentId, imageUrl, id).run()
    } else {
      // Jika hanya update teks saja
      await c.env.DB.prepare(`
        UPDATE categories 
        SET name = ?, slug = ?, type = ?, parent_id = ? 
        WHERE id = ?
      `).bind(name, slug, type, parentId, id).run()
    }

    return c.redirect('/admin/categories')
  } catch (error: any) {
    console.error("Gagal update kategori:", error)
    return c.redirect(`/admin/categories?error=${encodeURIComponent(error.message)}`)
  }
})

// ========================================================================
// 4. MANAJEMEN PRODUK (DENGAN UPLOAD GAMBAR KE CLOUDINARY)
// ========================================================================
app.post('/products/create', async (c) => {
  // Gunakan { all: true } untuk menangkap File (gambar) dan string sekaligus
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
    // Eksekusi unggah ke Cloudinary jika ada file gambar yang diinput
    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadToCloudinary(c.env.DB, imageFile)
    }

    await c.env.DB.prepare(`
      INSERT INTO products (category_id, provider_id, provider_product_code, name, stock_type, order_type, price, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(categoryId, providerId, providerProductCode, name, stockType, orderType, price, imageUrl).run()

    return c.redirect('/admin/products?success=true')
  } catch (error: any) {
    console.error("Gagal membuat produk:", error)
    return c.redirect(`/admin/products?error=${encodeURIComponent(error.message)}`)
  }
})

// ========================================================================
// 5. UPDATE DATA PRODUK (MENGGANTI HARGA / GAMBAR / STATUS)
// ========================================================================
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
      // Jika admin mengganti gambar
      const imageUrl = await uploadToCloudinary(c.env.DB, imageFile)
      
      await c.env.DB.prepare(`
        UPDATE products 
        SET category_id = ?, name = ?, stock_type = ?, order_type = ?, price = ?, status = ?, image_url = ? 
        WHERE id = ?
      `).bind(categoryId, name, stockType, orderType, price, status, imageUrl, id).run()
    } else {
      // Jika admin mengupdate data teks saja tanpa menyentuh form gambar
      await c.env.DB.prepare(`
        UPDATE products 
        SET category_id = ?, name = ?, stock_type = ?, order_type = ?, price = ?, status = ? 
        WHERE id = ?
      `).bind(categoryId, name, stockType, orderType, price, status, id).run()
    }
    
    return c.redirect(`/admin/products/${id}?success=true`)
  } catch (error: any) {
    console.error("Gagal update produk:", error)
    return c.redirect(`/admin/products/${id}?error=${encodeURIComponent(error.message)}`)
  }
})

// ========================================================================
// 6. MANAJEMEN PROVIDER H2H (BARU)
// ========================================================================
app.post('/providers/create', async (c) => {
  const body = await c.req.parseBody()
  
  const name = body.name as string
  const apiEndpoint = body.api_endpoint as string
  const apiKey = body.api_key as string
  const apiSecret = body.api_secret as string || null

  try {
    await c.env.DB.prepare(`
      INSERT INTO providers (name, api_endpoint, api_key, api_secret, status)
      VALUES (?, ?, ?, ?, 'active')
    `).bind(name, apiEndpoint, apiKey, apiSecret).run()

    return c.redirect('/admin/providers?success=true')
  } catch (error: any) {
    console.error("Gagal membuat provider:", error)
    return c.redirect(`/admin/providers?error=failed`)
  }
})

// ========================================================================
// 7. VALIDASI DEPOSIT MEMBER (BARU)
// ========================================================================

// A. Menyetujui Deposit
app.post('/deposits/:id/approve', async (c) => {
  const depositId = c.req.param('id')
  
  try {
    // 1. Cek deposit apakah valid dan masih pending
    const deposit = await c.env.DB.prepare(`SELECT user_id, amount FROM deposits WHERE id = ? AND status = 'pending'`).bind(depositId).first()
    
    if (!deposit) return c.redirect('/admin/deposits?error=not_found')

    // 2. Gunakan Batch agar transaksi aman (Jika satu gagal, gagal semua)
    await c.env.DB.batch([
      // Ubah status deposit
      c.env.DB.prepare(`UPDATE deposits SET status = 'success' WHERE id = ?`).bind(depositId),
      // Tambahkan saldo ke dompet user
      c.env.DB.prepare(`UPDATE wallets SET balance_available = balance_available + ? WHERE user_id = ?`).bind(deposit.amount, deposit.user_id)
    ])

    return c.redirect('/admin/deposits?success=approved')
  } catch (error) {
    console.error("Gagal menyetujui deposit:", error)
    return c.redirect('/admin/deposits?error=system_failed')
  }
})

// B. Menolak Deposit
app.post('/deposits/:id/reject', async (c) => {
  const depositId = c.req.param('id')
  
  try {
    await c.env.DB.prepare(`UPDATE deposits SET status = 'failed' WHERE id = ? AND status = 'pending'`).bind(depositId).run()
    return c.redirect('/admin/deposits?success=rejected')
  } catch (error) {
    return c.redirect('/admin/deposits?error=system_failed')
  }
})

export default app
