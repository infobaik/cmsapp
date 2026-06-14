import { Hono } from 'hono'
import { uploadToCloudinary } from '../../../services/cloudinary'

const app = new Hono()

// --- 1. Pengaturan Website (Disimpan Cepat ke Cloudflare KV) ---
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

// --- 2. Pengaturan Sistem Rahasia (Disimpan ke D1) ---
// Menangani form yang mengupdate sync_secret, kredensial Cloudinary, dll.
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

// --- 3. Manajemen Kategori ---
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

// --- 4. Manajemen Produk (Dengan Cloudinary Upload) ---
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

// --- 5. Update Data Produk ---
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

export default app
