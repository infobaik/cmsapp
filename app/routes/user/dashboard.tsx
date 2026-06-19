import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // 1. AMBIL PENGATURAN UI GLOBAL
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  sysSettings.forEach((row: any) => { settings[row.key] = row.value })

  // 2. AMBIL KATEGORI
  const { results: categories } = await c.env.DB.prepare(
    `SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
  ).all()

  // 3. LOGIKA VISIBILITAS
  const showCover = settings.ui_cat_show_cover === '1'
  const showIcon = settings.ui_cat_show_icon === '1'
  const deviceVis = settings.ui_cat_device || 'all'
  const forceFallback = !showCover && !showIcon

  // Karena bentuknya vertikal (langsing), kita bisa muat lebih banyak kolom (sampai 7 kolom di layar besar)
  let wrapperClass = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4 "
  if (deviceVis === 'desktop') wrapperClass += "hidden md:grid"
  if (deviceVis === 'mobile') wrapperClass += "grid md:hidden"

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      {/* BAGIAN WALLET TETAP SAMA */}
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
      
      <div class={wrapperClass}>
        {categories.map((cat: any) => (
          <a 
            // 🔥 PERBAIKAN MUTLAK: Dikembalikan ke ID sesuai dengan struktur aplikasi Anda!
            href={`/user/kategori/${cat.id}`} 
            class="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[2/3] bg-slate-900 transform hover:-translate-y-1"
          >
            {/* 🖼️ GAMBAR POSTER (FULL LAYAR KARTU) */}
            {showCover ? (
              <img 
                src={cat.cover_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781792255/default-cover.png'} 
                alt={cat.name} 
                class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
              />
            ) : (
              <div class="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
            )}

            {/* 🌑 GRADIENT OVERLAY (Gelap di bawah agar teks & icon terbaca) */}
            <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

            {/* 💎 KONTEN BAWAH (Icon + Text ditumpuk di sudut kiri bawah ala cover Netflix) */}
            <div class="absolute inset-x-0 bottom-0 p-3 flex flex-col items-start">
              
              {/* 🎯 ICON (Gaya Kaca / Glassmorphism) */}
              {(showIcon || forceFallback) && (
                 <div class="w-8 h-8 md:w-10 md:h-10 mb-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shadow-lg group-hover:bg-white/30 transition-colors">
                   <img 
                     src={cat.image_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781793434/enccb9r0usvm70mydthm.png'} 
                     alt={cat.name} 
                     class="w-full h-full object-contain drop-shadow-md" 
                   />
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
