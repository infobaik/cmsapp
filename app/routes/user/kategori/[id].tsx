import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../../src/services/wallet'

export default createRoute(async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')!
  
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // 1. CEK KATEGORI SAAT INI
  const category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(id).first()
  if (!category) return c.notFound()

  // 2. AMBIL PENGATURAN UI GLOBAL (Agar desainnya sama dengan Dashboard Induk)
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

  // 4. AMBIL PRODUK (Hanya dipanggil JIKA di dalam kategori ini tidak ada sub-kategori lagi)
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

  // 5. LOGIKA VISIBILITAS KATEGORI (Turunan dari Pengaturan Global)
  const showCover = settings.ui_cat_show_cover === '1'
  const showIcon = settings.ui_cat_show_icon === '1'
  const deviceVis = settings.ui_cat_device || 'all'
  const forceFallback = !showCover && !showIcon

  let wrapperClass = "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4 "
  if (deviceVis === 'desktop') wrapperClass += "hidden md:grid"
  if (deviceVis === 'mobile') wrapperClass += "grid md:hidden"

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
        <span class="font-semibold text-slate-800">{category.name}</span>
      </div>

      {/* KONDISIONAL RENDER: Menampilkan Grid Sub-Kategori atau List Produk */}
      {subCategories.length > 0 ? (
        /* ========================================================= */
        /* 🎬 GRID SUB-KATEGORI ALA POSTER FILM (SAMA PERSIS!) 🎬 */
        /* ========================================================= */
        <div class={wrapperClass}>
          {subCategories.map((cat: any) => (
            <a 
              href={`/user/kategori/${cat.id}`} 
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
      ) : (
        /* ========================================================= */
        /* 🛍️ DAFTAR PRODUK (Jika ini adalah kategori paling akhir) 🛍️ */
        /* ========================================================= */
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div class="p-4 bg-slate-50 border-b border-slate-100">
            <h3 class="font-bold text-slate-800">Pilih Produk {category.name}</h3>
          </div>
          <div class="divide-y divide-slate-100">
            {products.length > 0 ? products.map((prod: any) => (
              <a href={`/user/order/${prod.id}`} class="flex items-center justify-between p-4 hover:bg-indigo-50/50 transition-colors group">
                <div>
                  <h4 class="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors text-sm md:text-base">{prod.name}</h4>
                  <p class="text-xs text-slate-500 mt-1">{prod.description || 'Proses Cepat & Otomatis'}</p>
                </div>
                <div class="text-right ml-4 shrink-0">
                  <div class="font-bold text-indigo-600 text-sm md:text-base">Rp {prod.price.toLocaleString('id-ID')}</div>
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
