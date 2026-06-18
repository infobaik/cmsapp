import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const categoryId = c.req.param('id')

  // 1. Ambil detail data kategori saat ini (termasuk kolom image_url milik induk)
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

  // 2. Cek apakah ini Kategori Induk Utama (parent_id IS NULL) atau Sub-Kategori
  const isParent = category.parent_id === null
  let subCategories: any[] = []
  let products: any[] = []
  let pageTitle = category.name

  if (isParent) {
    // JIKA INDUK: Ambil sub-kategori / brand di bawahnya
    const { results } = await c.env.DB.prepare(
      `SELECT id, name, slug, image_url FROM categories WHERE parent_id = ? ORDER BY name ASC`
    ).bind(categoryId).all()
    subCategories = results || []
  } else {
    // JIKA SUB-KATEGORI: Tarik produk aktif yang lolos verifikasi visibilitas (is_visible = 1)
    const parentCat = await c.env.DB.prepare(`SELECT name FROM categories WHERE id = ?`).bind(category.parent_id).first()
    if (parentCat) pageTitle = `${parentCat.name} - ${category.name}`

    const { results } = await c.env.DB.prepare(
      `SELECT id, name, price, provider_product_code, order_type
       FROM products
       WHERE category_id = ? AND status = 'active' AND is_visible = 1
       ORDER BY price ASC`
    ).bind(categoryId).all()
    products = results || []
  }

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER NAVIGASI */}
      <div class="flex items-center gap-4 mb-2">
        <a href={isParent ? "/user/dashboard" : `/user/kategori/${category.parent_id}`} class="p-2.5 bg-[#18181b] border border-slate-800/60 rounded-xl text-slate-400 hover:text-white transition-colors shadow-sm">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-xl font-bold text-slate-100">{category.name}</h1>
          <p class="text-xs text-slate-400">
            {isParent ? 'Pilih jenis brand / layanan yang ingin Anda gunakan.' : 'Pilih layanan produk yang Anda butuhkan.'}
          </p>
        </div>
      </div>

      {/* TAMPILAN A: GRID SUB-KATEGORI */}
      {isParent && (
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {subCategories.length > 0 ? subCategories.map((sub: any) => {
            
            // LOGIKA FALLBACK BERJENJANG:
            // Gunakan sub.image_url jika ada, jika tidak ada pakai category.image_url (milik induk)
            const activeImage = sub.image_url || category.image_url

            return (
              <a href={`/user/kategori/${sub.id}`} class="flex flex-col items-center justify-center p-4 bg-[#18181b] border border-slate-800/60 hover:border-emerald-500/50 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 group">
                <div class="w-12 h-12 rounded-full bg-[#121217] flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 transition-colors overflow-hidden">
                  
                  {activeImage ? (
                    <img 
                      src={activeImage} 
                      alt={sub.name} 
                      class="w-full h-full object-cover" 
                      loading="lazy" 
                    />
                  ) : (
                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>
                  )}

                </div>
                <span class="text-xs font-semibold text-slate-300 text-center">{sub.name}</span>
              </a>
            )
          }) : (
            <div class="col-span-full text-center py-12 text-slate-500 text-xs bg-[#18181b] border border-dashed border-slate-800 rounded-2xl">
              Belum ada sub-kategori/brand di bawah layanan ini.
            </div>
          )}
        </div>
      )}

      {/* TAMPILAN B: TABEL PRODUK ULTRA RAMPING */}
      {!isParent && (
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-300 table-fixed">
              <thead class="bg-slate-900/40 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60">
                <tr>
                  <th class="px-4 py-4 w-[50%] sm:w-[60%]">Layanan</th>
                  <th class="px-4 py-4 text-right w-[30%] sm:w-[25%]">Harga</th>
                  <th class="px-4 py-4 text-center w-[20%] sm:w-[15%]">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/50">
                {products.length > 0 ? products.map((prod: any) => (
                  <tr class="hover:bg-slate-800/10 transition-colors">
                    <td class="px-4 py-3.5">
                      <span class="font-medium text-slate-200 block text-xs sm:text-sm truncate whitespace-normal">{prod.name}</span>
                      <span class="text-[9px] text-slate-500 font-mono block mt-0.5 uppercase tracking-wider">{prod.provider_product_code}</span>
                    </td>
                    <td class="px-4 py-3.5 text-right font-bold text-slate-100 whitespace-nowrap text-xs sm:text-sm">
                      Rp {prod.price.toLocaleString('id-ID')}
                    </td>
                    <td class="px-4 py-3.5 text-center whitespace-nowrap">
                      <a href={`/user/order/${prod.id}`} class={`px-3.5 py-1.5 text-white text-xs font-bold rounded-xl transition-all inline-block shadow-md ${prod.order_type === 'inquiry' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                         {prod.order_type === 'inquiry' ? 'Cek' : 'Beli'}
                      </a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={3} class="px-4 py-16 text-center text-slate-500 text-xs">
                      <div class="flex flex-col items-center justify-center space-y-2 opacity-60">
                        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                        <p>Belum ada layanan aktif di brand ini.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>,
    { title: pageTitle }
  )
})
