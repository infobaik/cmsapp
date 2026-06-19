import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // 1. AMBIL PENGATURAN UI GLOBAL
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  sysSettings.forEach((row: any) => { settings[row.key] = row.value })

  // 2. AMBIL KATEGORI UTAMA
  const { results: categories } = await c.env.DB.prepare(
    `SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
  ).all()

  // 3. LOGIKA VISIBILITAS OTONOM (Cover dan Icon berdiri sendiri)
  const coverVis = settings.ui_cat_cover_vis || 'all'
  const iconVis = settings.ui_cat_icon_vis || 'all'

  // Fungsi pintar pencipta class Tailwind sesuai perangkat yang diizinkan Admin
  const getVisClass = (vis: string, defaultDisplay: string) => {
    if (vis === 'hidden') return 'hidden '
    if (vis === 'desktop') return `hidden md:${defaultDisplay} `
    if (vis === 'mobile') return `${defaultDisplay} md:hidden `
    return `${defaultDisplay} `
  }

  // Generate class akhir untuk gambar dan icon
  const coverClass = getVisClass(coverVis, 'block') + "absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
  const iconClass = getVisClass(iconVis, 'flex') + "w-8 h-8 md:w-10 md:h-10 mb-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 p-1.5 items-center justify-center shadow-lg group-hover:bg-white/30 transition-colors"

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      {/* BAGIAN WALLET */}
      <div class="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <p class="text-indigo-100 text-sm font-medium mb-1">Saldo Tersedia</p>
          <h2 class="text-3xl font-bold tracking-tight">
            Rp {wallet.balance_available.toLocaleString('id-ID')}
          </h2>
        </div>
        <div class="mt-4 md:mt-0 flex space-x-3">
          <a href="/user/wallet" class="bg-white/20 hover:bg-white/30 transition-colors px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-sm">
            Isi Saldo
          </a>
          <a href="/user/history" class="bg-indigo-700/50 hover:bg-indigo-700/70 transition-colors px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-sm">
            Riwayat
          </a>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🎬 GRID KATEGORI ALA POSTER FILM (VERTICAL / PORTRAIT) 🎬 */}
      {/* ========================================================= */}
      <h3 class="text-lg font-bold text-slate-800 px-1">Layanan Tersedia</h3>
      
      <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
        {categories.map((cat: any) => (
          <a 
            href={`/user/kategori/${cat.id}`} 
            class="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[2/3] bg-gradient-to-br from-slate-800 to-slate-900 transform hover:-translate-y-1"
          >
            {/* 🖼️ GAMBAR POSTER (Menyesuaikan Pengaturan Admin) */}
            {coverVis !== 'hidden' && cat.cover_url && (
              <img 
                src={cat.cover_url} 
                alt={cat.name} 
                class={coverClass}
              />
            )}

            {/* 🌑 GRADIENT OVERLAY (Gelap di bawah agar teks & icon terbaca) */}
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

            {/* 💎 KONTEN BAWAH (Icon + Text ditumpuk di sudut kiri bawah ala cover Netflix) */}
            <div class="absolute inset-x-0 bottom-0 p-3 flex flex-col items-start z-10">
              
              {/* 🎯 ICON OTONOM */}
              {iconVis !== 'hidden' && (
                 <div class={iconClass}>
                   {cat.image_url ? (
                     <img 
                       src={cat.image_url} 
                       alt={cat.name} 
                       class="w-full h-full object-contain drop-shadow-md" 
                     />
                   ) : (
                     <div class="w-full h-full bg-slate-500/50 rounded flex items-center justify-center">
                       <span class="text-white text-xs font-bold">Ico</span>
                     </div>
                   )}
                 </div>
              )}

              {/* 📝 NAMA KATEGORI */}
              <h3 class="font-bold text-white text-[12px] md:text-[14px] leading-snug line-clamp-2 drop-shadow-lg group-hover:text-indigo-300 transition-colors">
                {cat.name}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
})
