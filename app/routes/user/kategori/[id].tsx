import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const categoryId = c.req.param('id')
  let activeSubId = c.req.query('sub') || ''

  // 1. Ambil informasi detail mengenai kategori saat ini yang sedang dibuka
  const category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(categoryId).first()

  if (!category) {
    return c.render(
      <div class="max-w-md mx-auto text-center py-12 bg-[#18181b] border border-slate-800 rounded-2xl my-8 p-6">
        <h2 class="text-lg font-bold text-slate-200 mb-2">Kategori Tidak Ditemukan</h2>
        <p class="text-sm text-slate-400 mb-4">Maaf, layanan yang Anda cari tidak tersedia.</p>
        <a href="/user/dashboard" class="text-xs bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-all">Kembali ke Dashboard</a>
      </div>,
      { title: 'Tidak Ditemukan' }
    )
  }

  let subCategories: any[] = []
  let products: any[] = []
  let pageTitle = category.name

  // 2. LOGIKA HIERARKI PINTAR: Periksa apakah kategori ini adalah Induk Utama (parent_id IS NULL)
  if (category.parent_id === null) {
    // Tarik semua sub-kategori / brand anak yang beraliansi dengan induk ini
    const { results } = await c.env.DB.prepare(
      `SELECT id, name, image_url FROM categories WHERE parent_id = ? AND type = 'product' ORDER BY name ASC`
    ).bind(categoryId).all()
    subCategories = results || []

    if (subCategories.length > 0) {
      // Jika tidak ada sub-kategori aktif terpilih di parameter URL, default ke sub-kategori pertama
      if (!activeSubId) {
        activeSubId = subCategories[0].id.toString()
      }
      
      // Ambil judul dari sub-kategori aktif untuk memperkaya konteks halaman
      const currentActiveSub = subCategories.find(s => s.id.toString() === activeSubId)
      if (currentActiveSub) pageTitle = `${category.name} - ${currentActiveSub.name}`

      // Tarik produk yang masuk dalam sub-kategori aktif tersebut
      const { results: prodResults } = await c.env.DB.prepare(
        `SELECT p.*, pr.name as provider_name 
         FROM products p
         LEFT JOIN providers pr ON p.provider_id = pr.id
         WHERE p.category_id = ? AND p.status = 'active'
         ORDER BY p.price ASC`
      ).bind(activeSubId).all()
      products = prodResults || []
    }
  } else {
    // JIKA YANG DIBUKA ADALAH SUB-KATEGORI LANGSUNG
    activeSubId = categoryId
    
    // Ambil semua saudara kandungnya (sub-kategori lain di bawah induk yang sama) agar menu tab navigasi tetap muncul
    const { results } = await c.env.DB.prepare(
      `SELECT id, name, image_url FROM categories WHERE parent_id = ? AND type = 'product' ORDER BY name ASC`
    ).bind(category.parent_id).all()
    subCategories = results || []

    const parentCat = await c.env.DB.prepare(`SELECT name FROM categories WHERE id = ?`).bind(category.parent_id).first()
    if (parentCat) pageTitle = `${parentCat.name} - ${category.name}`

    // Tarik langsung produk dari kategori ini
    const { results: prodResults } = await c.env.DB.prepare(
      `SELECT p.*, pr.name as provider_name 
       FROM products p
       LEFT JOIN providers pr ON p.provider_id = pr.id
       WHERE p.category_id = ? AND p.status = 'active'
       ORDER BY p.price ASC`
    ).bind(categoryId).all()
    products = prodResults || []
  }

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      {/* TOMBOL KEMBALI & HEADER */}
      <div class="flex items-center gap-4 mb-2">
        <a href="/user/dashboard" class="p-2.5 bg-[#18181b] border border-slate-800/60 rounded-xl text-slate-400 hover:text-white transition-colors shadow-sm">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-xl font-bold text-slate-100">{category.parent_id === null ? category.name : 'Pilihan Layanan'}</h1>
          <p class="text-xs text-slate-400">Silakan pilih variasi brand dan tentukan nominal produk.</p>
        </div>
      </div>

      {/* TABS SUB-KATEGORI / BRAND (MOBILE-FRIENDLY RESPONSIVE HORIZONTAL SCROLL) */}
      {subCategories.length > 0 && (
        <div class="bg-[#18181b] border border-slate-800/60 p-3 rounded-2xl shadow-sm">
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0 scroll-smooth snap-x">
            {subCategories.map((sub: any) => {
              const isSelected = sub.id.toString() === activeSubId
              // Jika kategori yang dibuka adalah induk utama, link tab mengarah ke diri sendiri dengan query string '?sub='
              // Jika yang dibuka adalah sub-kategori, link tab berpindah langsung ke route ID sub-kategori tersebut
              const targetUrl = category.parent_id === null 
                ? `/user/kategori/${category.id}?sub=${sub.id}`
                : `/user/kategori/${sub.id}`

              return (
                <a href={targetUrl} class={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shrink-0 snap-align-start border ${isSelected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm' : 'bg-[#121217] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'}`}>
                  {sub.image_url && (
                    <div class="w-5 h-5 rounded-md bg-white overflow-hidden p-0.5 shrink-0 flex items-center justify-center">
                      <img src={sub.image_url} alt={sub.name} class="w-full h-full object-contain" />
                    </div>
                  )}
                  <span>{sub.name}</span>
                </a>
              )
            })}
          </div>
        </div>
      )}

      {/* KATALOG DAFTAR PRODUK */}
      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
        <div class="p-4 border-b border-slate-800/60 bg-slate-900/20">
          <h3 class="text-sm font-bold text-slate-200 uppercase tracking-wide">Daftar Variasi Nominal</h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/40 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60 whitespace-nowrap">
              <tr>
                <th class="px-6 py-4.5">Nama Produk / Layanan</th>
                <th class="px-6 py-4.5 text-center">Jenis</th>
                <th class="px-6 py-4.5 text-right">Harga Satuan</th>
                <th class="px-6 py-4.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
              {products.length > 0 ? products.map((prod: any) => (
                <tr class="hover:bg-slate-800/20 transition-colors group">
                  <td class="px-6 py-4.5">
                    <span class="font-semibold text-slate-200 block group-hover:text-emerald-400 transition-colors">{prod.name}</span>
                    <span class="text-[10px] text-slate-500 font-mono mt-0.5 block uppercase tracking-wider">{prod.provider_product_code}</span>
                  </td>
                  <td class="px-6 py-4.5 text-center whitespace-nowrap">
                    <span class={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${prod.order_type === 'postpaid' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                      {prod.order_type}
                    </span>
                  </td>
                  <td class="px-6 py-4.5 text-right font-bold text-slate-100 whitespace-nowrap text-base">
                    Rp {prod.price.toLocaleString('id-ID')}
                  </td>
                  <td class="px-6 py-4.5 text-center whitespace-nowrap">
                    <a href={`/user/order/new?product_id=${prod.id}`} class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all inline-block shadow-md shadow-emerald-600/10 hover:shadow-emerald-500/20">
                      Beli Sekarang
                    </a>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} class="px-6 py-16 text-center text-slate-500 text-xs">
                    <div class="flex flex-col items-center justify-center space-y-2 opacity-60">
                      <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                      <p>Belum ada produk aktif yang tersedia untuk sub-kategori ini.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>,
    { title: pageTitle }
  )
})
