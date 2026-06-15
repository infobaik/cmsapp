import { Hono } from 'hono'
import { getDigiflazzPriceList } from '../../services/providers/digiflazz'

const app = new Hono()

// Proteksi: Hanya bisa diakses oleh sistem (Cron) atau admin yang membawa Secret Key yang valid
app.use('/*', async (c, next) => {
  const incomingSecret = c.req.header('x-sync-secret')
  
  // Tarik secret key terbaru langsung dari Database D1
  const setting = await c.env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'sync_secret'`).first()
  
  if (!setting || incomingSecret !== setting.value) {
    return c.json({ error: 'Akses Ditolak. Secret Key tidak valid.' }, 403)
  }
  
  await next()
})

app.post('/sync', async (c) => {
  // 1. Tarik konfigurasi profit margin dinamis
  const marginSetting = await c.env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'default_profit_margin'`).first()
  const dynamicMargin = marginSetting ? Number(marginSetting.value) : 0

  // 2. Ambil daftar supplier yang aktif
  const { results: suppliers } = await c.env.DB.prepare(`SELECT id, api_endpoint, api_key, api_secret FROM providers WHERE status = 'active'`).all()

  let totalSynced = 0

  for (const supplier of suppliers) {
    try {
      // 3. Ambil data API Digiflazz
      const externalProducts = await getDigiflazzPriceList({
         endpoint: supplier.api_endpoint as string,
         key: supplier.api_key as string,
         secret: supplier.api_secret as string
      }, 'prepaid')

      // Gunakan klausa ON CONFLICT pada multiple column sesuai skema UNIQUE(provider_id, provider_product_code)
      const stmt = c.env.DB.prepare(`
         INSERT INTO products (provider_id, provider_product_code, category_id, name, stock_type, order_type, price, status) 
         VALUES (?, ?, 1, ?, 'general', 'prepaid', ?, ?)
         ON CONFLICT(provider_id, provider_product_code) DO UPDATE SET 
           price = excluded.price,
           status = excluded.status,
           name = excluded.name
      `)

      const batchStatements = []
      for (const item of externalProducts.data) {
         // Validasi status dari Digiflazz (normal / gangguan)
         const localStatus = (item.seller_product_status === true && item.buyer_product_status === true) ? 'active' : 'inactive'
         const sellingPrice = item.price + dynamicMargin

         batchStatements.push(
           stmt.bind(supplier.id, item.buyer_sku_code, item.product_name, sellingPrice, localStatus)
         )
         totalSynced++
      }

      // 4. Eksekusi batch per 100 baris untuk efisiensi Cloudflare D1
      const chunkSize = 100
      for (let i = 0; i < batchStatements.length; i += chunkSize) {
         const chunk = batchStatements.slice(i, i + chunkSize)
         await c.env.DB.batch(chunk)
      }
    } catch (e) {
      console.error(`Gagal sync supplier ID ${supplier.id}`, e)
    }
  }

  return c.json({ message: 'Sinkronisasi Selesai', total_synced: totalSynced })
})

export default app
