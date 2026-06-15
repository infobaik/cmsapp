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
  // 1. Tarik konfigurasi profit margin dari D1 (Pastikan key 'default_profit_margin' sudah ditambahkan via Admin Panel)
  const marginSetting = await c.env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'default_profit_margin'`).first()
  
  // Jika setting tidak ditemukan di database, gunakan 0 sebagai fallback aman
  const dynamicMargin = marginSetting ? Number(marginSetting.value) : 0

  // Ambil daftar supplier yang aktif...
  const { results: suppliers } = await c.env.DB.prepare(`SELECT id, api_endpoint, api_key, api_secret FROM providers WHERE status = 'active'`).all()

  let totalSynced = 0

  for (const supplier of suppliers) {
    try {
      // (Logika fetch dari getDigiflazzPriceList seperti sebelumnya)
      const externalProducts = await getDigiflazzPriceList({
         endpoint: supplier.api_endpoint,
         key: supplier.api_key,
         secret: supplier.api_secret
      }, 'prepaid');

      const stmt = c.env.DB.prepare(`
         INSERT INTO products (provider_id, provider_product_code, category_id, name, stock_type, order_type, price, status) 
         VALUES (?, ?, 1, ?, 'general', 'prepaid', ?, ?)
         ON CONFLICT(provider_id, provider_product_code) DO UPDATE SET 
           price = excluded.price,
           status = excluded.status,
           name = excluded.name
      `);

      const batchStatements = [];
      for (const item of externalProducts.data) {
         const localStatus = (item.seller_product_status === true && item.buyer_product_status === true) ? 'active' : 'inactive';
         
         // PERBAIKAN: Gunakan variabel dinamis dari database
         const sellingPrice = item.price + dynamicMargin; 

         batchStatements.push(
           stmt.bind(supplier.id, item.buyer_sku_code, item.product_name, sellingPrice, localStatus)
         );
         totalSynced++;
      }

      // Eksekusi batch per 100 baris untuk efisiensi D1
      const chunkSize = 100;
      for (let i = 0; i < batchStatements.length; i += chunkSize) {
         const chunk = batchStatements.slice(i, i + chunkSize);
         await c.env.DB.batch(chunk);
      }
      
    } catch (e) {
      console.error(`Gagal sync supplier ID ${supplier.id}`, e)
    }
  }

  return c.json({ message: 'Sinkronisasi Selesai', total_synced: totalSynced })
})

  return c.json({ message: 'Sinkronisasi Selesai', total_synced: totalSynced })
})

export default app
