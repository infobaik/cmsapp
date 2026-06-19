import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // 1. AMBIL PENGATURAN UI GLOBAL
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  sysSettings.forEach((row: any) => { settings[row.key] = row.value })

  // 2. AMBIL KATEGORI (Tambahkan cover_url di query)
  const { results: categories } = await c.env.DB.prepare(
    `SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
  ).all()

  // 3. LOGIKA VISIBILITAS
  const showCover = settings.ui_cat_show_cover === '1'
  const showIcon = settings.ui_cat_show_icon === '1'
  const deviceVis = settings.ui_cat_device || 'all'
  const forceFallback = !showCover && !showIcon

  let wrapperClass = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4 "
  if (deviceVis === 'desktop') wrapperClass += "hidden md:grid"
  if (deviceVis === 'mobile') wrapperClass += "grid md:hidden"

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      {/* BAGIAN WALLET / SALDO TETAP SAMA */}
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
      {/* 🌟 GRID KATEGORI ALA KOKINPAY (MODERN MINIMALIST) 🌟 */}
      {/* ========================================================= */}
      <h3 class="text-lg font-bold text-slate-800 px-1">Layanan Tersedia</h3>
      
      <div class={wrapperClass}>
        {categories.map((cat: any) => (
          <a 
            href={`/kategori/${cat.slug}`} 
            class="group relative bg-white rounded-[1.25rem] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-slate-100 hover:border-indigo-100 transition-all duration-300 ease-out transform hover:-translate-y-1 flex flex-col"
          >
            {/* 🖼️ RENDER COVER (Gaya Melengkung di Atas) */}
            {showCover && (
              <div class="relative h-20 md:h-24 w-full bg-slate-50 overflow-hidden">
                <img 
                  src={cat.cover_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781792255/default-cover.png'} 
                  alt={cat.name} 
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
                {/* Gradien Tipis agar Icon lebih menonjol */}
                <div class="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-60"></div>
              </div>
            )}

            {/* 💎 KONTEN KARTU BAWAH */}
            <div class={`flex flex-col items-center text-center px-2 pb-4 ${showCover ? 'pt-0' : 'pt-5'}`}>
              
              {/* 🎯 RENDER ICON (Floating / Mengambang) */}
              {(showIcon || forceFallback) && (
                 <div class={`relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 bg-white rounded-2xl shadow-sm border border-slate-100 z-10 
                             ${showCover ? '-mt-6 md:-mt-7 mb-2' : 'mb-3'} transition-transform group-hover:scale-105`}>
                   <img 
                     src={cat.image_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781793434/enccb9r0usvm70mydthm.png'} 
                     alt={cat.name} 
                     class="w-7 h-7 md:w-8 md:h-8 object-contain" 
                   />
                 </div>
              )}

              {/* 📝 NAMA KATEGORI */}
              <h3 class="font-bold text-slate-700 group-hover:text-indigo-600 text-[11px] md:text-[13px] leading-tight line-clamp-2 px-1">
                {cat.name}
              </h3>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
})
