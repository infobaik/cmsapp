import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const search = c.req.query('search') || ''

  const query = `SELECT id, parent_id, name, image_url FROM categories ORDER BY name ASC`
  const { results: categories } = await c.env.DB.prepare(query).all()

  const parentsForForm = categories.filter((cat: any) => cat.parent_id === null)

  let filteredCategories = [...categories]

  if (search) {
    const searchLower = search.toLowerCase()
    const matchingIds = new Set<number>()

    categories.forEach((cat: any) => {
      if (cat.name.toLowerCase().includes(searchLower)) {
        matchingIds.add(cat.id)
        if (cat.parent_id !== null) {
          matchingIds.add(cat.parent_id)
        }
      }
    })

    categories.forEach((cat: any) => {
      if (cat.parent_id !== null && matchingIds.has(cat.parent_id)) {
        matchingIds.add(cat.id)
      }
    })

    filteredCategories = filteredCategories.filter((cat: any) => matchingIds.has(cat.id))
  }

  const displayParents = filteredCategories.filter((cat: any) => cat.parent_id === null)

  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Kategori & Brand</h1>
        <p class="text-sm text-slate-400">Kelola hierarki, Icon, dan Cover Poster untuk produk PPOB.</p>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium shadow-sm">
          Operasi kategori berhasil dilakukan!
        </div>
      )}
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium shadow-sm">
          Gagal memproses perubahan data kategori.
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM TAMBAH KATEGORI / BRAND */}
        <div class="lg:col-span-1 bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl h-fit shadow-sm">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Tambah Baru</h2>
          
          <form method="POST" action="/api/admin/v1/categories/create" enctype="multipart/form-data" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Kategori / Brand</label>
              <input type="text" name="name" required placeholder="Cth: Pulsa, Telkomsel, DANA" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm transition-colors" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kategori Induk</label>
              <select name="parent_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm cursor-pointer">
                <option value="">-- Jadikan Induk Utama --</option>
                {parentsForForm.map((p: any) => (
                  <option value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div class="pt-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Icon / Logo Brand</label>
              <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-2 text-slate-400 text-xs outline-none transition-colors file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 cursor-pointer" />
            </div>

            <div class="pt-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Cover Poster (Opsional)</label>
              <input type="file" name="cover" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 focus:border-purple-500/50 rounded-xl p-2 text-slate-400 text-xs outline-none transition-colors file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-400 hover:file:bg-purple-500/20 cursor-pointer" />
              <p class="text-[10px] text-slate-500 mt-1.5 leading-relaxed">Akan menjadi background ala poster film di dashboard user.</p>
            </div>

            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm">
              Simpan Kategori
            </button>
          </form>
        </div>

        {/* LIST KATEGORI DENGAN PANEL PENCARIAN TETAP SAMA */}
        <div class="lg:col-span-2 bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl shadow-sm flex flex-col">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Daftar Hierarki Kategori & Brand</h2>
          
          <form method="GET" action="/admin/categories" class="mb-5 flex gap-2">
            <div class="flex-1 relative">
              <input type="text" name="search" value={search} placeholder="Cari induk kategori atau nama brand..." class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-2.5 pl-9 text-slate-200 outline-none text-xs transition-all placeholder-slate-600" />
              <svg width="14" height="14" class="absolute left-3 top-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            {search && (
              <a href="/admin/categories" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-colors border border-slate-700 shadow-sm">
                Reset
              </a>
            )}
          </form>
          
          <div class="space-y-4 flex-1">
            {displayParents.map((parent: any) => (
              <div class="bg-[#121217] border border-slate-800/60 rounded-xl p-4 shadow-sm">
                
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    {parent.image_url ? (
                       <img src={parent.image_url} alt={parent.name} class="w-8 h-8 rounded bg-white object-contain p-1 shadow-sm" />
                    ) : (
                       <div class="w-8 h-8 rounded bg-slate-800 border border-slate-700/50 flex items-center justify-center text-slate-500">
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                       </div>
                    )}
                    <span class="font-bold text-slate-200 block text-sm">{parent.name}</span>
                  </div>
                  <a href={`/admin/categories/${parent.id}`} class="text-xs bg-slate-850 border border-slate-700 hover:bg-blue-600 hover:border-blue-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all shadow-sm">
                    Edit
                  </a>
                </div>
                
                {filteredCategories.filter((child: any) => child.parent_id === parent.id).length > 0 && (
                  <ul class="ml-11 space-y-2 border-l border-slate-800/80 pl-4 py-1">
                    {filteredCategories
                      .filter((child: any) => child.parent_id === parent.id)
                      .map((child: any) => (
                        <li class="flex items-center justify-between text-sm text-slate-300 group">
                           <div class="flex items-center gap-3">
                             {child.image_url ? (
                                <img src={child.image_url} alt={child.name} class="w-6 h-6 rounded bg-white object-contain p-0.5 shadow-sm" />
                             ) : (
                                <div class="w-6 h-6 rounded border border-slate-700 bg-slate-800/50"></div>
                             )}
                             <span class="text-slate-300 group-hover:text-blue-400 transition-colors text-xs font-medium">{child.name}</span>
                           </div>
                           <a href={`/admin/categories/${child.id}`} class="text-[10px] font-bold text-blue-400 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition-all bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">
                             Edit Brand
                           </a>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
            
            {displayParents.length === 0 && (
              <div class="text-center py-12 text-slate-500 text-xs bg-[#121217] border border-dashed border-slate-800 rounded-xl">
                <svg width="32" height="32" class="mx-auto mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Tidak ada hasil pencarian kategori yang cocok.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>,
    { title: 'Kategori & Brand' }
  )
})
