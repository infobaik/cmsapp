import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const query = `SELECT id, parent_id, name, type FROM categories ORDER BY type, name`
  const { results: categories } = await c.env.DB.prepare(query).all()

  const parents = categories.filter((cat: any) => cat.parent_id === null)

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Kategori & Label</h1>
        <p class="text-sm text-slate-400">Kelola hierarki produk dan artikel di website Anda.</p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORM TAMBAH KATEGORI */}
        <div class="lg:col-span-1 bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl h-fit">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Tambah Baru</h2>
          <form method="POST" action="/api/admin/v1/categories/create" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Kategori</label>
              <input type="text" name="name" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Slug URL (Opsional)</label>
              <input type="text" name="slug" placeholder="contoh-kategori" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-400 text-sm outline-none transition-colors" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Peruntukan Tipe</label>
              <select name="type" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="product">Katalog Produk</option>
                <option value="blog">Artikel / Blog</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kategori Induk</label>
              <select name="parent_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="">-- Tidak Ada (Jadikan Parent) --</option>
                {parents.map((p: any) => (
                  <option value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
            <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-2 shadow-lg shadow-blue-500/20">
              Simpan Kategori
            </button>
          </form>
        </div>

        {/* LIST KATEGORI */}
        <div class="lg:col-span-2 bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Daftar Hierarki Kategori</h2>
          
          <div class="space-y-4">
            {parents.map((parent: any) => (
              <div class="bg-[#121217] border border-slate-800/60 rounded-xl p-4">
                <div class="flex items-center gap-2 mb-3">
                  <svg width="18" height="18" class="text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" /></svg>
                  <span class="font-bold text-slate-200">{parent.name}</span>
                  <span class="text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded ml-2">{parent.type}</span>
                </div>
                
                {categories.filter((child: any) => child.parent_id === parent.id).length > 0 && (
                  <ul class="ml-6 pl-4 border-l border-slate-800 space-y-2">
                    {categories
                      .filter((child: any) => child.parent_id === parent.id)
                      .map((child: any) => (
                        <li class="flex items-center gap-2 text-sm text-slate-400 before:content-[''] before:w-3 before:h-px before:bg-slate-700">
                          {child.name}
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
    { title: 'Kategori' }
  )
})
