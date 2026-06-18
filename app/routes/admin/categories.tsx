import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const query = `SELECT id, parent_id, name, type, image_url FROM categories ORDER BY type, name`
  const { results: categories } = await c.env.DB.prepare(query).all()

  const parents = categories.filter((cat: any) => cat.parent_id === null)

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Kategori & Brand</h1>
        <p class="text-sm text-slate-400">Kelola hierarki dan Icon/Logo untuk produk Anda di sini.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM TAMBAH KATEGORI / BRAND */}
        <div class="lg:col-span-1 bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl h-fit">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Tambah Baru</h2>
          
          <form method="POST" action="/api/admin/v1/categories/create" enctype="multipart/form-data" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Kategori / Brand</label>
              <input type="text" name="name" required placeholder="Cth: Pulsa, Telkomsel, DANA" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kategori Induk</label>
              <select name="parent_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="">-- Jadikan Induk Utama --</option>
                {parents.map((p: any) => (
                  <option value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Icon / Logo Brand</label>
              <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-2 text-slate-400 text-sm outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20" />
              <p class="text-[10px] text-slate-500 mt-1">Gambar ini akan otomatis digunakan oleh semua produk di bawah kategori ini.</p>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Peruntukan Tipe</label>
              <select name="type" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="product">Produk PPOB</option>
                <option value="blog">Artikel / Blog</option>
              </select>
            </div>

            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2 shadow-lg shadow-blue-500/20">
              Simpan Kategori
            </button>
          </form>
        </div>

        {/* LIST KATEGORI */}
        <div class="lg:col-span-2 bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Daftar Hierarki Kategori & Brand</h2>
          
          <div class="space-y-4">
            {parents.map((parent: any) => (
              <div class="bg-[#121217] border border-slate-800/60 rounded-xl p-4">
                
                {/* HEADER KATEGORI INDUK DENGAN TOMBOL EDIT */}
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    {parent.image_url ? (
                       <img src={parent.image_url} alt={parent.name} class="w-8 h-8 rounded bg-white object-contain p-1" />
                    ) : (
                       <div class="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-slate-500">
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                       </div>
                    )}
                    <div>
                      <span class="font-bold text-slate-200 block">{parent.name}</span>
                      <span class="text-[10px] text-slate-500 uppercase tracking-wider">{parent.type}</span>
                    </div>
                  </div>
                  {/* TOMBOL EDIT KATEGORI INDUK */}
                  <a href={`/admin/categories/${parent.id}`} class="text-xs bg-slate-800 border border-slate-700 hover:bg-blue-600 hover:border-blue-500 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-all">
                    Edit
                  </a>
                </div>
                
                {categories.filter((child: any) => child.parent_id === parent.id).length > 0 && (
                  <ul class="ml-11 space-y-2 border-l border-slate-800 pl-4 py-1">
                    {categories
                      .filter((child: any) => child.parent_id === parent.id)
                      .map((child: any) => (
                        <li class="flex items-center justify-between text-sm text-slate-300 group">
                           <div class="flex items-center gap-3">
                             {child.image_url ? (
                                <img src={child.image_url} alt={child.name} class="w-6 h-6 rounded bg-white object-contain p-0.5" />
                             ) : (
                                <div class="w-6 h-6 rounded border border-slate-700 bg-slate-800/50"></div>
                             )}
                             <span>{child.name}</span>
                           </div>
                           {/* TOMBOL EDIT BRAND/SUB-KATEGORI */}
                           <a href={`/admin/categories/${child.id}`} class="text-[11px] font-semibold text-blue-500 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-all bg-blue-500/10 px-2 py-1 rounded">
                             Edit Brand
                           </a>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
            
            {parents.length === 0 && <p class="text-sm text-slate-500 py-4 text-center">Belum ada kategori yang dibuat.</p>}
          </div>
        </div>

      </div>
    </div>,
    { title: 'Kategori & Brand' }
  )
})
