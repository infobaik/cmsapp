import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../../src/services/wallet'

export default createRoute(async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')!
  
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // 1. CEK KATEGORI SAAT INI
  const category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(id).first()
  if (!category) return c.notFound()

  // 2. AMBIL PENGATURAN UI GLOBAL
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  sysSettings.forEach((row: any) => { settings[row.key] = row.value })

  // 3. AMBIL SUB KATEGORI
  const { results: subCategories } = await c.env.DB.prepare(`
    SELECT id, name, slug, image_url, cover_url 
    FROM categories 
    WHERE parent_id = ? 
    ORDER BY name ASC
  `).bind(id).all()

  // 4. AMBIL PRODUK (Tarik semua kolom termasuk provider_product_code)
  let products: any[] = []
  if (subCategories.length === 0) {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*, pr.name as provider_name 
      FROM products p
      JOIN providers pr ON p.provider_id = pr.id
      WHERE p.category_id = ? AND p.status = 'active' AND p.is_visible = 1
      ORDER BY p.price ASC
    `).bind(id).all()
    products = results
  }

  // 5. LOGIKA VISIBILITAS OTONOM
  const coverVis = settings.ui_cat_cover_vis || 'all'
  const iconVis = settings.ui_cat_icon_vis || 'all'

  const getVisClass = (vis: string, defaultDisplay: string) => {
    if (vis === 'hidden') return 'hidden '
    if (vis === 'desktop') return `hidden md:${defaultDisplay} `
    if (vis === 'mobile') return `${defaultDisplay} md:hidden `
    return `${defaultDisplay} `
  }

  const coverClass = getVisClass(coverVis, 'block') + "absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
  const iconClass = getVisClass(iconVis, 'flex') + "w-8 h-8 md:w-10 md:h-10 mb-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 p-1.5 items-center justify-center shadow-lg group-hover:bg-white/30 transition-colors"

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER SALDO */}
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
        </div>
      </div>

      {/* NAVIGASI BREADCRUMB */}
      <div class="flex items-center space-x-2 text-sm text-slate-500 px-1">
        <a href="/user/dashboard" class="hover:text-indigo-600 transition-colors font-medium">Beranda</a>
        <span>&rsaquo;</span>
        <span class="font-semibold text-slate-800">{category.name as string}</span>
      </div>

      {subCategories.length > 0 ? (
        /* GRID SUB-KATEGORI ALA POSTER FILM */
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
          {subCategories.map((cat: any) => (
            <a 
              href={`/user/kategori/${cat.id}`} 
              class="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[2/3] bg-gradient-to-br from-slate-800 to-slate-900 transform hover:-translate-y-1"
            >
              {coverVis !== 'hidden' && cat.cover_url && (
                <img src={cat.cover_url} alt={cat.name} class={coverClass} />
              )}
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <div class="absolute inset-x-0 bottom-0 p-3 flex flex-col items-start z-10">
                {iconVis !== 'hidden' && (
                   <div class={iconClass}>
                     {cat.image_url ? (
                       <img src={cat.image_url} alt={cat.name} class="w-full h-full object-contain drop-shadow-md" />
                     ) : (
                       <div class="w-full h-full bg-slate-500/50 rounded flex items-center justify-center">
                         <span class="text-white text-xs font-bold">Ico</span>
                       </div>
                     )}
                   </div>
                )}
                <h3 class="font-bold text-white text-[12px] md:text-[14px] leading-snug line-clamp-2 drop-shadow-lg group-hover:text-indigo-300 transition-colors">
                  {cat.name}
                </h3>
              </div>
            </a>
          ))}
        </div>
      ) : (
        /* ========================================================= */
        /* 🛍️ DAFTAR PRODUK (DENGAN KODE PRODUK INLINE RINGKAS) 🛍️ */
        /* ========================================================= */
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-100">
            <h3 class="font-bold text-slate-800">Pilih Produk {category.name as string}</h3>
          </div>
          <div class="divide-y divide-slate-100">
            {products.length > 0 ? products.map((prod: any) => (
              <a href={`/user/order/${prod.id}`} class="flex items-center justify-between p-4 hover:bg-indigo-50/50 transition-colors group">
                <div class="flex-1 pr-4">
                  <h4 class="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-sm md:text-base leading-tight">
                    {prod.name}
                  </h4>
                  
                  {/* 🔥 INI DIA: Kolom Gabungan Ringkas (Kode + Label) */}
                  <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span class="text-[10px] font-bold font-mono bg-slate-200/70 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300/50">
                      {prod.provider_product_code}
                    </span>

                    {prod.is_open_amount === 1 ? (
                      <span class="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                        Input Bebas
                      </span>
                    ) : (
                      <span class="text-[11px] text-slate-500 line-clamp-1">
                        {prod.description || 'Proses Cepat Otomatis'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Blok Harga Pintar */}
                <div class="text-right shrink-0 flex flex-col items-end justify-center">
                  {prod.is_open_amount === 1 ? (
                    <>
                      <div class="font-bold text-slate-700 text-sm md:text-base">+ Rp {prod.price.toLocaleString('id-ID')}</div>
                      <span class="text-[10px] text-slate-400">Biaya Layanan</span>
                    </>
                  ) : prod.order_type === 'inquiry' ? (
                    <div class="font-bold text-indigo-600 text-sm md:text-base">Cek Tagihan</div>
                  ) : (
                    <div class="font-bold text-indigo-600 text-sm md:text-base">Rp {prod.price.toLocaleString('id-ID')}</div>
                  )}
                </div>
              </a>
            )) : (
              <div class="p-8 text-center text-slate-500 flex flex-col items-center">
                <span class="text-3xl mb-2">📦</span>
                <p>Produk belum tersedia di kategori ini.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
})
