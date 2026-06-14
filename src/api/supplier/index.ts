import { Hono } from 'hono'

const app = new Hono()

// Proteksi: Hanya bisa diakses oleh sistem (Cron) atau admin yang membawa Secret Key yang valid
app.use('/*', async (c, next) => {
  const incomingSecret = c.req.header('x-sync-secret')
  
  // 1. Tarik secret key terbaru langsung dari Database D1
  const setting = await c.env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'sync_secret'`).first()
  
  if (!setting || incomingSecret !== setting.value) {
    return c.json({ error: 'Akses Ditolak. Secret Key tidak valid.' }, 403)
  }
  
  await next()
})

app.post('/sync', async (c) => {
  // Ambil daftar supplier yang aktif dari database
  const { results: suppliers } = await c.env.DB.prepare(`SELECT id, api_endpoint, api_key, api_secret FROM providers WHERE status = 'active'`).all()

  let totalSynced = 0

  for (const supplier of suppliers) {
    try {
      // Logika untuk fetch data dari supplier luar
      // Format fetch akan disesuaikan dengan dokumentasi masing-masing provider
      const response = await fetch(supplier.api_endpoint as string, {
        headers: { 
          'Authorization': `Bearer ${supplier.api_key}`,
          'Content-Type': 'application/json'
        }
      })
      
      const externalProducts = await response.json()

      // Lakukan loop untuk update atau insert ke database lokal (D1)
      for (const item of externalProducts.data) {
        // Contoh query UPSERT (Insert atau Update jika sudah ada)
        await c.env.DB.prepare(`
          INSERT INTO products (provider_id, provider_product_code, category_id, name, stock_type, order_type, price, status) 
          VALUES (?, ?, 1, ?, 'unique', 'prepaid', ?, 'active')
          ON CONFLICT(provider_product_code) DO UPDATE SET price = ?
        `).bind(supplier.id, item.sku_code, item.name, item.price, item.price).run()
        
        totalSynced++
      }
    } catch (e) {
      console.error(`Gagal sync supplier ID ${supplier.id}`, e)
    }
  }

  return c.json({ message: 'Sinkronisasi Selesai', total_synced: totalSynced })
})

export default app
