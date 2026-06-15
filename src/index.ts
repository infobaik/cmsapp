import { Hono } from 'hono'
import publicApi from './api/public/v1'
import adminApi from './api/admin/v1'
import waApi from './api/wa/v1'
import tgApi from './api/tg/v1'

// 1. Import modul Supplier (Untuk Sinkronisasi Cronjob)
import supplierApi from './api/supplier/index' 

// 2. Import modul Webhook (Untuk Menerima Callback dari Digiflazz)
import digiflazzWebhook from './api/webhook/digiflazz' 

const api = new Hono()

// Mount rute public (Tanpa proteksi token)
api.route('/api/public/v1', publicApi)

// Mount rute khusus klien/bot
api.route('/api/wa/v1', waApi)
api.route('/api/tg/v1', tgApi)

// Mount rute khusus admin
api.route('/api/admin/v1', adminApi)

// Mount rute API Sinkronisasi Supplier
api.route('/api/supplier/v1', supplierApi)

// Mount rute Webhook Digiflazz
api.route('/api/webhook/digiflazz', digiflazzWebhook)

export default api
