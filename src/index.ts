import { Hono } from 'hono'
import publicApi from './api/public/v1'
import adminApi from './api/admin/v1'
import waApi from './api/wa/v1'
import tgApi from './api/tg/v1'
import digiflazzWebhook from './api/webhook/digiflazz'
const api = new Hono()

// Mount rute public (Tanpa proteksi token)
api.route('/api/public/v1', publicApi)

// Mount rute khusus klien/bot
// Catatan: Di dalam filenya nanti akan ada middleware pengecekan API Key
api.route('/api/wa/v1', waApi)
api.route('/api/tg/v1', tgApi)

// Mount rute khusus admin (Bisa ditambahkan middleware auth API di sini jika via eksternal)
api.route('/api/admin/v1', adminApi)
api.route('/api/webhook/digiflazz', digiflazzWebhook)
export default api
