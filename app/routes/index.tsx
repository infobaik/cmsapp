import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // AMBIL PENGATURAN UI GLOBAL
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  sysSettings.forEach((row: any) => { settings[row.key] = row.value })

  // AMBIL KATEGORI PUBLIC
  const { results: categories } = await c.env.DB.prepare(
    `SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
  ).all()

  // LOGIKA VISIBILITAS
  const showCover = settings.ui_cat_show_cover === '1'
  const showIcon = settings.ui_cat_show_icon === '1'
  const deviceVis = settings.ui_cat_device || 'all'
  const forceFallback = !showCover && !showIcon

  let wrapperClass = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4 "
  if (deviceVis === 'desktop') wrapperClass += "hidden md:grid"
  if (deviceVis === 'mobile') wrapperClass += "grid md:hidden"

  return c.render(
    <div class="max-w-7xl mx-auto space-y-12">
      
      {/* HEADER HERO */}
      <div class="text-center py-12 md:py-16 bg-gradient-to-b from-indigo-50 to-white rounded-3xl mt-4">
        <h1 class="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight mb-4">
          Top Up & Tagihan <span class="text-indigo-600">Semakin Mudah</span>
        </h1>
        <p class="text-slate-500 max-w-2xl mx-auto">
          Platform layanan PPOB tercepat, termurah, dan terpercaya. Transaksi otomatis 24 jam nonstop.
        </p>
      </div>

      {/* ========================================================= */}
      {/* 🎬 GRID KATEGORI ALA POSTER FILM (PUBLIK) 🎬 */}
      {/* ========================================================= */}
      <div class="px-2">
        <h3 class="text-xl font-bold text-slate-800 mb-6">Pilih Layanan</h3>
        
        <div class={wrapperClass}>
          {categories.map((cat: any) => (
            <a 
              href={`/kategori/${cat.slug}`} 
              class="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[2/3] bg-slate-900 transform hover:-translate-y-1"
            >
              {showCover ? (
                <img 
                  src={cat.cover_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781792255/default-cover.png'} 
                  alt={cat.name} 
                  class="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
                />
              ) : (
                <div class="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600"></div>
              )}

              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300"></div>

              <div class="absolute inset-x-0 bottom-0 p-3 flex flex-col items-start">
                
                {(showIcon || forceFallback) && (
                   <div class="w-8 h-8 md:w-10 md:h-10 mb-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 p-1.5 flex items-center justify-center shadow-lg group-hover:bg-white/30 transition-colors">
                     <img 
                       src={cat.image_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781793434/enccb9r0usvm70mydthm.png'} 
                       alt={cat.name} 
                       class="w-full h-full object-contain drop-shadow-md" 
                     />
                   </div>
                )}

                <h3 class="font-bold text-white text-[12px] md:text-[14px] leading-snug line-clamp-2 drop-shadow-lg group-hover:text-indigo-300 transition-colors">
                  {cat.name}
                </h3>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
})
