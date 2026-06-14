import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const siteConfig = await c.env.SITE_KV.get('site_settings', 'json') || {
    siteName: '',
    siteDescription: '',
    themeColor: '#10b981' // Default ke hijau emerald
  } as any

  const successMsg = c.req.query('success')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Pengaturan Sistem</h1>
        <p class="text-sm text-slate-400">Konfigurasi ini akan langsung di-*cache* ke jaringan global Cloudflare KV.</p>
      </div>

      {successMsg === 'true' && (
        <div class="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Pengaturan berhasil disimpan dan di-cache global!
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8">
        <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-6 border-b border-slate-800/60 pb-3 flex items-center gap-2">
          <svg width="20" height="20" class="text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0021 5.25V12zM3 12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 12v-1.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v1.5z" /></svg>
          Identitas Web Publik
        </h2>
        
        <form method="POST" action="/api/admin/v1/settings/update" class="space-y-6">
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-2">Nama Website (Title)</label>
            <input type="text" name="siteName" value={siteConfig.siteName} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors" />
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-2">Deskripsi SEO (Meta Description)</label>
            <textarea name="siteDescription" rows={3} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors resize-none">{siteConfig.siteDescription}</textarea>
            <p class="text-[10px] text-slate-500 mt-1">Disarankan maksimal 160 karakter untuk optimasi mesin pencari.</p>
          </div>
          
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-2">Warna Tema Aksen Utama</label>
            <div class="flex items-center gap-4">
              <input type="color" name="themeColor" value={siteConfig.themeColor} class="w-14 h-14 bg-transparent rounded cursor-pointer" />
              <span class="text-sm text-slate-400 font-mono uppercase">{siteConfig.themeColor}</span>
            </div>
          </div>
          
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-colors shadow-lg shadow-blue-500/20 mt-4">
            Simpan Konfigurasi KV
          </button>
        </form>
      </div>

    </div>,
    { title: 'Pengaturan Sistem' }
  )
})
