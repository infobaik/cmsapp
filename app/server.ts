import { createApp } from 'honox/server'
import { logger } from 'hono/logger'
import api from '../src/index'

// createApp() secara otomatis memindai dan memuat semua file SSR di dalam app/routes/
const app = createApp()

// 1. TAMBAHKAN LOGGER: Ini akan mencetak setiap request (dan statusnya) ke terminal/console
app.use('*', logger())

// 2. TAMBAHKAN GLOBAL ERROR HANDLER: Menangkap semua crash SSR agar tidak layarnya putih/blank
app.onError((err, c) => {
  // Cetak detail error dan baris kodenya ke terminal server
  console.error('🔥 [FATAL ERROR]:', err)
  
  // Tampilkan pesan error langsung ke browser agar mudah di-debug (bisa dimatikan saat production)
  return c.html(`
    <div style="font-family: system-ui, sans-serif; padding: 2rem; background: #fff1f2; color: #9f1239; min-height: 100vh;">
      <div style="max-w: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h1 style="margin-top: 0; display: flex; align-items: center; gap: 10px;">
          <span>🚨</span> 500 Internal Server Error
        </h1>
        <p><strong>Pesan Error:</strong> ${err.message}</p>
        <div style="margin-top: 1rem;">
          <strong>Stack Trace:</strong>
          <pre style="background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: 14px; white-space: pre-wrap; word-break: break-all;">${err.stack}</pre>
        </div>
      </div>
    </div>
  `, 500)
})

// Gabungkan seluruh jalur API Backend (src/index.ts) ke dalam aplikasi utama
app.route('/', api)

// Ekspor aplikasi utuh untuk diubah menjadi _worker.js oleh Cloudflare Pages
export default app
