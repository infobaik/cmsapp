import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // 1. Ambil parameter dari URL untuk pencarian, filter, dan paginasi
  const search = c.req.query('search') || ''
  const categoryId = c.req.query('category') || ''
  const providerId = c.req.query('provider') || ''
  
  const page = Math.max(1, parseInt(c.req.query('page') || '1', 10))
  const limitOptions = [10, 20, 50, 100]
  let limit = parseInt(c.req.query('limit') || '20', 10)
  if (!limitOptions.includes(limit)) limit = 20

  // 2. Siapkan klausa WHERE secara dinamis
  let whereClauses = []
  let bindParams: any[] = []

  if (search) {
    whereClauses.push(`(p.name LIKE ? OR p.provider_product_code LIKE ? OR c.name LIKE ?)`)
    bindParams.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  if (categoryId) {
    whereClauses.push(`p.category_id = ?`)
    bindParams.push(categoryId)
  }
  if (providerId) {
    whereClauses.push(`p.provider_id = ?`)
    bindParams.push(providerId)
  }

  const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

  // 3. Eksekusi query untuk menghitung total baris data (untuk paginasi)
  const countQuery = `
    SELECT count(p.id) as total 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN providers pr ON p.provider_id = pr.id
    ${whereString}
  `
  const countResult = await c.env.DB.prepare(countQuery).bind(...bindParams).first()
  const totalItems = (countResult?.total as number) || 0
  const totalPages = Math.max(1, Math.ceil(totalItems / limit))
  
  // Pastikan halaman tidak melebihi batas maksimum jika limit diubah
  const actualPage = page > totalPages ? totalPages : page
  const offset = (actualPage - 1) * limit

  // 4. Eksekusi query untuk mengambil data produk lengkap dengan tipe ordernya
  const dataQuery = `
    SELECT p.id, p.name, p.provider_product_code, p.stock_type, p.order_type, p.price, p.status, p.is_visible,
           c.name as category_name, pr.name as provider_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN providers pr ON p.provider_id = pr.id
    ${whereString}
    ORDER BY p.id DESC
    LIMIT ? OFFSET ?
  `
  const dataParams = [...bindParams, limit, offset]
  const { results: products } = await c.env.DB.prepare(dataQuery).bind(...dataParams).all()

  // 5. Ambil data master untuk dropdown filter (PERBAIKAN: Kondisi `type = 'product'` TELAH DIHAPUS)
  const { results: categories } = await c.env.DB.prepare(`SELECT id, name FROM categories ORDER BY name ASC`).all()
  const { results: providers } = await c.env.DB.prepare(`SELECT id, name FROM providers ORDER BY name ASC`).all()

  const successMsg = c.req.query('success')

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER SECTION */}
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Katalog Produk</h1>
          <p class="text-sm text-slate-400">Kelola daftar layanan dan produk hasil sinkronisasi H2H.</p>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <a href="/admin/products/sync" class="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Sync JSON
          </a>
          <a href="/admin/products/new" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
            Tambah Manual
          </a>
        </div>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium shadow-sm">
          {decodeURIComponent(successMsg).replace(/\+/g, ' ')}
        </div>
      )}

      <form method="GET" action="/admin/products" class="space-y-6">
        {/* BARIS PENCARIAN & FILTER (MOBILE FRIENDLY) */}
        <div class="bg-[#18181b] border border-slate-800/60 p-4 lg:p-5 rounded-2xl flex flex-col lg:flex-row gap-4 items-end shadow-sm">
          
          <div class="w-full lg:flex-1">
            <label class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Pencarian</label>
            <div class="relative">
              <input type="text" name="search" value={search} placeholder="Cari kode SKU, nama produk, atau brand..." class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 pl-11 text-slate-200 outline-none text-sm transition-all" />
              <svg width="18" height="18" class="absolute left-4 top-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
          
          <div class="w-full lg:w-48">
            <label class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Kategori/Brand</label>
            <select name="category" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm transition-all cursor-pointer">
              <option value="">Semua Grup</option>
              {categories.map((c: any) => <option value={c.id} selected={c.id == categoryId}>{c.name}</option>)}
            </select>
          </div>

          <div class="w-full lg:w-48">
            <label class="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Provider</label>
            <select name="provider" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm transition-all cursor-pointer">
              <option value="">Semua Provider</option>
              {providers.map((p: any) => <option value={p.id} selected={p.id == providerId}>{p.name}</option>)}
            </select>
          </div>

          <div class="flex gap-2 w-full lg:w-auto mt-2 lg:mt-0">
            <button type="submit" name="page" value="1" class="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm shadow-lg shadow-blue-500/20">
              Filter
            </button>
            <a href="/admin/products" class="flex-1 lg:flex-none bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold py-3 px-6 rounded-xl transition-colors text-sm text-center border border-slate-700">
              Reset
            </a>
          </div>
        </div>

        {/* TABEL PRODUK */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
          <div class="overflow-x-auto">
            <table class="w-full text-left text-sm text-slate-300">
              <thead class="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60 whitespace-nowrap">
                <tr>
                  <th class="px-6 py-4">Produk & SKU</th>
                  <th class="px-6 py-4">Brand & Supplier</th>
                  <th class="px-6 py-4 text-center">Tipe Alur</th>
                  <th class="px-6 py-4 text-right">Harga Sistem</th>
                  <th class="px-6 py-4 text-center">Katalog User</th>
                  <th class="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/60">
                {products.length > 0 ? products.map((p: any) => (
                  <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-4">
                      <span class="font-bold text-slate-200 block whitespace-normal min-w-[220px]">{p.name}</span>
                      <span class="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1">
                        {p.provider_product_code}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="block text-slate-300 font-medium">{p.category_name || '-'}</span>
                      <span class="text-[10px] text-slate-500 block mt-0.5 uppercase tracking-wide">{p.provider_name || '-'}</span>
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <span class={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                        p.order_type === 'inquiry' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                        p.order_type === 'postpaid' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      }`}>
                        {p.order_type}
                      </span>
                    </td>
                    <td class={`px-6 py-4 font-bold text-right whitespace-nowrap text-sm ${p.price < 0 ? 'text-orange-400' : p.price === 0 ? 'text-slate-400' : 'text-emerald-400'}`}>
                      {p.price < 0 ? `- Rp ${Math.abs(p.price).toLocaleString('id-ID')}` : `Rp ${p.price.toLocaleString('id-ID')}`}
                    </td>
                    <td class="px-6 py-4 text-center whitespace-nowrap">
                      <span class={`px-2 py-0.5 rounded text-[10px] font-bold ${p.is_visible === 1 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                        {p.is_visible === 1 ? 'Tampil' : 'Sembunyi'}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right whitespace-nowrap">
                      <a href={`/admin/products/${p.id}`} class="px-3 py-1.5 bg-[#121217] border border-slate-800 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg text-xs font-medium transition-all inline-block shadow-sm">Edit</a>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} class="px-6 py-16 text-center">
                       <div class="flex flex-col items-center justify-center text-slate-500">
                         <svg width="48" height="48" class="mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                         <p>Tidak ada produk yang tersedia.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* KONTROL PAGINASI */}
        <div class="bg-[#18181b] border border-slate-800/60 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          
          <div class="flex items-center gap-3 text-xs md:text-sm text-slate-400">
            <span>Tampilkan</span>
            <select name="limit" onchange="this.form.submit()" class="bg-[#121217] border border-slate-800/60 hover:border-blue-500/50 rounded-lg py-1.5 px-2 outline-none focus:border-blue-500 text-slate-200 transition-colors font-medium cursor-pointer">
              {limitOptions.map(opt => <option value={opt} selected={opt === limit}>{opt}</option>)}
            </select>
            <span>dari <strong class="text-slate-200">{totalItems}</strong> data</span>
          </div>

          {totalItems > 0 && (
            <div class="flex items-center gap-3">
              <button type="submit" name="page" value={actualPage - 1} disabled={actualPage <= 1} class="p-2 rounded-xl bg-[#121217] border border-slate-700 text-slate-300 hover:text-white hover:border-blue-500 disabled:opacity-50 disabled:hover:border-slate-700 disabled:cursor-not-allowed transition-all">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </button>
              
              <span class="text-xs md:text-sm font-semibold text-slate-300 px-2 tracking-wide">
                Hal {actualPage} / {totalPages}
              </span>
              
              <button type="submit" name="page" value={actualPage + 1} disabled={actualPage >= totalPages} class="p-2 rounded-xl bg-[#121217] border border-slate-700 text-slate-300 hover:text-white hover:border-blue-500 disabled:opacity-50 disabled:hover:border-slate-700 disabled:cursor-not-allowed transition-all">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          )}
        </div>

      </form>
    </div>,
    { title: 'Katalog Produk' }
  )
})
