import { Hono } from 'hono'

// Import semua sub-router yang sudah dipisah rapi di foldernos masing-masing
import publicApi from './api/public/v1/index'
import userApi from './api/user/v1/index'
import adminApi from './api/admin/v1/index'
import webhookOkeConnect from './api/webhook/okeconnect'

// Jika Anda sudah membuat file webhook atau wa, bisa di-uncomment nanti:
// import webhookApi from './api/webhook/digiflazz'
// import waApi from './api/wa/v1/index'

const app = new Hono()

// Registrasi Prefix (Semua rute aman di jalurnya sendiri)
app.route('/api/public/v1', publicApi)
app.route('/api/user/v1', userApi)
app.route('/api/admin/v1', adminApi)
app.route('/api/webhook/okeconnect', webhookOkeConnect)
// app.route('/api/webhook', webhookApi)
// app.route('/api/wa/v1', waApi)

// Fallback 404 khusus API (Tidak akan mengganggu rute UI HonoX)
app.all('/api/*', (c) => {
  return c.json({ error: 'Endpoint API tidak ditemukan' }, 404)
})

export default app
