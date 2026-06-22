import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // 1. AMBIL PENGATURAN UI GLOBAL
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  ;(sysSettings || []).forEach((row: any) => { settings[row.key] = row.value })

  // 2. AMBIL KATEGORI PUBLIC
  const { results: categories } = await c.env.DB.prepare(
    `SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
  ).all()

  // 3. LOGIKA VISIBILITAS
  const coverVis = settings.ui_cat_cover_vis || 'all'
  const iconVis = settings.ui_cat_icon_vis || 'all'

  const getVisClass = (vis: string, defaultDisplay: string) => {
    if (vis === 'hidden') return 'hidden '
    if (vis === 'desktop') return `hidden md:${defaultDisplay} `
    if (vis === 'mobile') return `${defaultDisplay} md:hidden `
    return `${defaultDisplay} `
  }

  // Animasi & Transisi untuk gambar cover (Banner belakang game)
  const coverClass = getVisClass(coverVis, 'block') + "absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80 group-hover:opacity-100"
  
  // Gaya Ikon yang melayang dan lebih elegan (Premium Feel)
  const iconClass = getVisClass(iconVis, 'flex') + "w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-900/60 backdrop-blur-md border border-white/10 p-1.5 items-center justify-center shadow-xl transition-all duration-300"

  return c.render(
    <div class="max-w-7xl mx-auto space-y-10 pb-16 pt-4">
      
      {/* ========================================================= */}
      {/* 👑 HERO SECTION ALA BANGJEFF (GAMING/DARK VIBE)           */}
      {/* ========================================================= */}
      <div class="px-2 md:px-0">
        <div class="relative rounded-[2rem] overflow-hidden bg-slate-900 aspect-[16/9] md:aspect-[24/7] shadow-2xl border border-slate-800">
          {/* Background pattern/image placeholder */}
          <div class="absolute inset-0 bg-[url('https://res.cloudinary.com/dqlxjihc9/image/upload/v1781792255/default-cover.png')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div class="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/90 to-transparent"></div>
          <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent"></div>
          
          <div class="absolute inset-0 p-6 md:p-12 lg:p-16 flex flex-col justify-center max-w-3xl">
            <span class="inline-block py-1 px-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] md:text-xs font-bold tracking-widest mb-4 w-fit uppercase">
              ⚡ Platform Top Up #1
            </span>
            <h1 class="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight mb-4 drop-shadow-md">
              Topup Cepat, <br class="hidden md:block" />
              <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Harga Merakyat.</span>
            </h1>
            <p class="text-slate-400 text-sm md:text-lg max-w-xl font-medium mb-8">
              Beli kredit game, pulsa, dan bayar tagihan dengan instan. Tanpa ribet daftar, pesanan langsung masuk detik ini juga!
            </p>
            
            {/* SEARCH BAR GLASSMORPHISM */}
            <div class="relative max-w-md w-full">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg class="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
              <input 
                type="text" 
                placeholder="Cari game atau layanan..." 
                class="w-full bg-[#121217]/80 backdrop-blur-md border border-slate-700/50 text-white rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500 shadow-xl" 
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🏷️ TABS KATEGORI (Hiasan visual UI Premium)               */}
      {/* ========================================================= */}
      <div class="flex overflow-x-auto hide-scrollbar gap-3 py-2 px-2 -mt-4">
        <button class="whitespace-nowrap px-6 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 border border-indigo-500 transition-all hover:scale-105">🔥 Sedang Tren</button>
        <button class="whitespace-nowrap px-6 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 hover:bg-slate-700 hover:text-white transition-all">🎮 Game Mobile</button>
        <button class="whitespace-nowrap px-6 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 hover:bg-slate-700 hover:text-white transition-all">💻 Game PC</button>
        <button class="whitespace-nowrap px-6 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 hover:bg-slate-700 hover:text-white transition-all">📱 Pulsa & Data</button>
        <button class="whitespace-nowrap px-6 py-2.5 rounded-2xl bg-slate-800 text-slate-300 font-bold text-sm border border-slate-700 hover:bg-slate-700 hover:text-white transition-all">💡 Tagihan</button>
      </div>

      {/* ========================================================= */}
      {/* 🎬 GRID KATEGORI (BANGJEFF STYLE)                         */}
      {/* ========================================================= */}
      <div class="px-2">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-xl md:text-2xl font-black text-white flex items-center gap-2">
            <svg class="w-6 h-6 text-indigo-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" /></svg>
            Pilih Layanan
          </h3>
          <a href="#" class="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Lihat Semua &rsaquo;</a>
        </div>
        
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 md:gap-5">
          {(categories || []).map((cat: any) => (
            <a 
              href={`/kategori/${cat.id}`}
              class="group relative block rounded-3xl overflow-hidden shadow-lg hover:shadow-indigo-500/20 transition-all duration-300 aspect-[3/4] bg-slate-800 border border-slate-700/40 hover:border-indigo-500/50 transform hover:-translate-y-2"
            >
              {/* Gambar Background (Cover) */}
              {coverVis !== 'hidden' && (
                cat.cover_url && String(cat.cover_url).startsWith('http') ? (
                  <img src={cat.cover_url} alt={cat.name} class={coverClass} />
                ) : (
                  <div class="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900"></div>
                )
              )}

              {coverVis === 'hidden' && (
                <div class="absolute inset-0 w-full h-full bg-gradient-to-br from-indigo-900 to-slate-900"></div>
              )}

              {/* Gradient shadow yang tinggi untuk menonjolkan teks */}
              <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>

              <div class="absolute inset-x-0 bottom-0 p-3 md:p-4 flex flex-col items-center text-center z-10">
                
                {/* Ikon Mengambang (Floating Icon Effect) */}
                {iconVis !== 'hidden' && (
                   <div class={iconClass + " -mt-10 mb-2.5 group-hover:-translate-y-1"}>
                     {cat.image_url && String(cat.image_url).startsWith('http') ? (
                       <img src={cat.image_url} alt={cat.name} class="w-full h-full object-contain drop-shadow-md rounded-lg" />
                     ) : (
                       <span class="text-slate-400 text-[10px] font-bold">Ico</span>
                     )}
                   </div>
                )}

                <h3 class="font-extrabold text-white text-[13px] md:text-[15px] leading-tight line-clamp-2 drop-shadow-lg group-hover:text-indigo-400 transition-colors">
                  {cat.name}
                </h3>
                <p class="text-[9px] md:text-[10px] text-emerald-400 font-bold mt-1.5 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Instan
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
      
      {/* CSS KHUSUS UNTUK MENYEMBUNYIKAN SCROLLBAR PADA TAB KATEGORI */}
      <style dangerouslySetInnerHTML={{ __html: `
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  )
})
