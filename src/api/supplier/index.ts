import { Hono } from 'hono'
import { getDigiflazzPriceList } from '../../services/providers/digiflazz'

const app = new Hono()

app.use('/*', async (c, next) => {
  const incomingSecret = c.req.header('x-sync-secret')
  const setting = await c.env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'sync_secret'`).first()
  
  if (!setting || incomingSecret !== setting.value) {
    return c.json({ error: 'Akses Ditolak. Secret Key tidak valid.' }, 403)
  }
  await next()
})

app.post('/sync', async (c) => {
  const debugLogs: any[] = [] 
  let totalSynced = 0

  try {
    const marginSetting = await c.env.DB.prepare(`SELECT value FROM system_settings WHERE key = 'default_profit_margin'`).first()
    const dynamicMargin = marginSetting ? Number(marginSetting.value) : 0

    const { results: suppliers } = await c.env.DB.prepare(`SELECT id, name, api_endpoint, api_key, api_secret FROM providers WHERE status = 'active'`).all()
    
    if (suppliers.length === 0) {
       debugLogs.push({ status: "Warning", message: "Tidak ada provider dengan status 'active' di database." })
    }

    for (const supplier of suppliers) {
      const supplierLog = {
        provider_id: supplier.id,
        provider_name: supplier.name,
        status: "Processing",
        synced_items: 0,
        error: null as string | null
      }

      try {
        const externalProducts = await getDigiflazzPriceList({
           endpoint: supplier.api_endpoint as string,
           key: supplier.api_key as string,
           secret: supplier.api_secret as string
        }, 'prepaid')

        if (!externalProducts || !externalProducts.data || !Array.isArray(externalProducts.data)) {
           supplierLog.status = "Failed"
           supplierLog.error = "Data produk dari Digiflazz kosong atau struktur JSON tidak valid."
           debugLogs.push(supplierLog)
           continue 
        }

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
           const localStatus = (item.seller_product_status === true && item.buyer_product_status === true) ? 'active' : 'inactive'
           const sellingPrice = item.price + dynamicMargin

           batchStatements.push(
             stmt.bind(supplier.id, item.buyer_sku_code, item.product_name, sellingPrice, localStatus)
           )
        }

        // AKSI CRITICAL: Jalankan batch d1 dan hitung total_synced HANYA jika sukses commit
        const chunkSize = 100
        for (let i = 0; i < batchStatements.length; i += chunkSize) {
           const chunk = batchStatements.slice(i, i + chunkSize)
           
           // Jika baris ini crash (misal akibat Foreign Key), ia langsung melompat ke blok catch bawah
           await c.env.DB.batch(chunk) 
           
           // Hanya bertambah jika database berhasil mengeksekusi chunk SQL tanpa error
           totalSynced += chunk.length 
           supplierLog.synced_items += chunk.length
        }
        
        supplierLog.status = "Success"
        debugLogs.push(supplierLog)

      } catch (e: any) {
        supplierLog.status = "Database / System Error"
        supplierLog.error = e.message || String(e)
        debugLogs.push(supplierLog)
      }
    }

    return c.json({ 
      message: 'Proses Sinkronisasi Selesai', 
      total_synced: totalSynced,
      debug_logs: debugLogs 
    })

  } catch (fatalError: any) {
    return c.json({
      message: 'Kesalahan Fatal pada Skrip Sinkronisasi',
      error: fatalError.message || String(fatalError),
      debug_logs: debugLogs
    }, 500)
  }
})

export default app
