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
    <div class="max-w-5xl mx-auto space-y-6 pb-12">
      <div class="mb-6 flex items-center gap-4">
        <div>
           <h1 class="text-2xl font-bold text-slate-100">Pengaturan Sistem & Website</h1>
           <p class="text-sm text-slate-400">Kelola konfigurasi API, tampilan UI, dan mesin pencari (SEO).</p>
        </div>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium mb-6 flex items-center gap-2">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
          Pengaturan berhasil disimpan ke sistem!
        </div>
      )}
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6">
          Terjadi kesalahan saat menyimpan pengaturan.
        </div>
      )}

      {/* FORM RAKSASA (MENGIRIM SEMUA DATA SEKALIGUS) */}
      <form method="POST" action="/api/admin/v1/system/update" class="space-y-6">
        
        {/* ========================================== */}
        {/* BLOK PENGATURAN UI KATEGORI */}
        {/* ========================================== */}
        <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl shadow-xl">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="text-purple-500"><path stroke-linecap="round" stroke-linejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
            Tampilan Katalog & Kategori
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Tampilkan Cover Poster</label>
              <select name="ui_cat_show_cover" class="w-full bg-[#121217] border border-slate-800/60 focus:border-purple-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm cursor-pointer">
                <option value="1" selected={settings.ui_cat_show_cover === '1' || !settings.ui_cat_show_cover}>Ya, Tampilkan (Desain Poster Film)</option>
                <option value="0" selected={settings.ui_cat_show_cover === '0'}>Tidak, Sembunyikan</option>
              </select>
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Tampilkan Icon Logo</label>
              <select name="ui_cat_show_icon" class="w-full bg-[#121217] border border-slate-800/60 focus:border-purple-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm cursor-pointer">
                <option value="1" selected={settings.ui_cat_show_icon === '1' || !settings.ui_cat_show_icon}>Ya, Tampilkan (Mengambang)</option>
                <option value="0" selected={settings.ui_cat_show_icon === '0'}>Tidak, Sembunyikan</option>
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Visibilitas Perangkat</label>
              <select name="ui_cat_device" class="w-full bg-[#121217] border border-slate-800/60 focus:border-purple-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm cursor-pointer">
                <option value="all" selected={settings.ui_cat_device === 'all' || !settings.ui_cat_device}>Desktop & Mobile (Semua)</option>
                <option value="desktop" selected={settings.ui_cat_device === 'desktop'}>Hanya di Layar Desktop</option>
                <option value="mobile" selected={settings.ui_cat_device === 'mobile'}>Hanya di Layar Mobile</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* BLOK PENGATURAN SEO & META INFO */}
        {/* ========================================== */}
        <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl shadow-xl">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="text-emerald-500"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Pengaturan SEO & Meta
          </h2>
          
          <div class="space-y-5">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Judul Website (Meta Title)</label>
              <input type="text" name="seo_site_title" value={settings.seo_site_title || ''} placeholder="Contoh: PasPulsa - Agen Pulsa & PPOB Termurah" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Deskripsi Singkat (Meta Description)</label>
              <textarea name="seo_site_description" rows="3" placeholder="Contoh: Platform penyedia layanan isi ulang pulsa, kuota, dan tagihan PPOB 24 Jam non-stop..." class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm resize-none">{settings.seo_site_description || ''}</textarea>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kata Kunci (Meta Keywords)</label>
              <input type="text" name="seo_site_keywords" value={settings.seo_site_keywords || ''} placeholder="Contoh: pulsa murah, agen kuota, bayar pln, h2h ppob" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm" />
              <p class="text-[10px] text-slate-500 mt-1.5">Pisahkan setiap kata kunci menggunakan koma (,).</p>
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* BLOK PENGATURAN CLOUDINARY */}
        {/* ========================================== */}
        <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl shadow-xl">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="text-blue-500"><path stroke-linecap="round" stroke-linejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
            Konfigurasi Storage Cloudinary
          </h2>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Cloud Name</label>
              <input type="text" name="cloudinary_cloud_name" value={settings.cloudinary_cloud_name || ''} placeholder="Contoh: dzxy123" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">API Key</label>
              <input type="text" name="cloudinary_api_key" value={settings.cloudinary_api_key || ''} placeholder="Masukkan API Key" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">API Secret</label>
              <input type="password" name="cloudinary_api_secret" value={settings.cloudinary_api_secret || ''} placeholder="Masukkan API Secret" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>
          </div>
        </div>

        {/* ========================================== */}
        {/* TOMBOL SIMPAN GLOBAL */}
        {/* ========================================== */}
        <div class="sticky bottom-4 z-50">
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2">
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            Simpan Seluruh Pengaturan
          </button>
        </div>

      </form>
    </div>,
    { title: 'Pengaturan Sistem' }
  )
})
