import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Ambil semua pengaturan dari database
  const { results } = await c.env.DB.prepare(`SELECT key, value FROM system_settings`).all()
  const settings: Record<string, string> = {}
  results.forEach((row: any) => {
    settings[row.key] = row.value
  })

  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="mb-6 flex items-center gap-4">
        <h1 class="text-2xl font-bold text-slate-100">Pengaturan Sistem & API</h1>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium mb-6">
          Pengaturan berhasil disimpan!
        </div>
      )}
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6">
          Terjadi kesalahan saat menyimpan pengaturan.
        </div>
      )}

      {/* FORM PENGATURAN CLOUDINARY */}
      <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl shadow-xl">
        <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
          Konfigurasi Storage Cloudinary
        </h2>
        
        <form method="POST" action="/api/admin/v1/system/update" class="space-y-5">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Cloud Name</label>
              <input type="text" name="cloudinary_cloud_name" value={settings.cloudinary_cloud_name || ''} required placeholder="Contoh: dzxy123" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">API Key</label>
              <input type="text" name="cloudinary_api_key" value={settings.cloudinary_api_key || ''} required placeholder="Masukkan API Key" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">API Secret</label>
              <input type="password" name="cloudinary_api_secret" value={settings.cloudinary_api_secret || ''} required placeholder="Masukkan API Secret" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors mt-4">
            Simpan Kredensial Cloudinary
          </button>
        </form>
      </div>

    </div>,
    { title: 'Pengaturan Sistem' }
  )
})
