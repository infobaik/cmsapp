import { createApp } from 'honox/server'
import api from '../src/index'

// createApp() secara otomatis memindai dan memuat semua file SSR di dalam app/routes/
const app = createApp()

// Gabungkan seluruh jalur API Backend (src/index.ts) ke dalam aplikasi utama
app.route('/', api)

// Ekspor aplikasi utuh untuk diubah menjadi _worker.js oleh Cloudflare Pages
export default app
