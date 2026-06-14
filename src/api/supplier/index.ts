import { Hono } from 'hono'

const app = new Hono()

// Proteksi: Hanya bisa diakses oleh sistem atau admin
app.use('/*', async (c, next) => {
  const secret = c.req.header('x-sync-secret')
  if (secret !== c.env.SYNC_SECRET) return c.json({ error: 'Akses Ditolak' }, 403)
  await next()
})

app.post('/sync', async (c) => {
  // Ambil daftar supplier dari database
  const { results: suppliers } = await c.env.DB.prepare(`SELECT id, api_endpoint, credentials FROM suppliers`).all()

  let totalSynced = 0

  for (const supplier of suppliers) {
    try {
      // Panggil API dari masing-masing supplier
      const response = await fetch(supplier.api_endpoint as string, {
        headers: { 'Authorization': `Bearer ${supplier.credentials}` }
      })
      const externalProducts = await response.json()

      // Lakukan loop untuk update atau insert ke database lokal kita (D1)
      for (const item of externalProducts.data) {
        // Logika update harga/stok jika produk sudah ada, atau insert jika baru
        await c.env.DB.prepare(`
          INSERT INTO products (supplier_id, name, stock_type, price, status) 
          VALUES (?, ?, 'unique', ?, 'active')
          ON CONFLICT(name) DO UPDATE SET price = ?
        `).bind(supplier.id, item.name, item.price, item.price).run()
        totalSynced++
      }
    } catch (e) {
      console.error(`Gagal sync supplier ID ${supplier.id}`, e)
    }
  }

  return c.json({ message: 'Sinkronisasi Selesai', total_synced: totalSynced })
})

export default app
