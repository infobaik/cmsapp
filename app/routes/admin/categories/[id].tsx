import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const id = c.req.param('id')
  const categoryId = Number(id)
  
  const category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(categoryId).first()
  
  if (!category) {
    return c.redirect('/admin/categories?error=not_found')
  }

  // Ambil daftar parent untuk dropdown (tidak boleh memilih dirinya sendiri sebagai parent)
  const { results: parents } = await c.env.DB.prepare(`SELECT id, name, type FROM categories WHERE parent_id IS NULL AND id != ?`).bind(categoryId).all()
  
  const errorMsg = c.req.query('error')
  const successMsg = c.req.query('success')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/categories" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Edit Kategori & Brand</h1>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6">
          Gagal memperbarui kategori.
        </div>
      )}
      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium mb-6">
          Kategori berhasil diperbarui!
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8 shadow-xl">
        <form method="POST" action={`/api/admin/v1/categories/${categoryId}/update`} enctype="multipart/form-data" class="space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Kategori / Brand</label>
              <input type="text" name="name" value={category.name as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-medium" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kategori Induk</label>
              <select name="parent_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="">-- Jadikan Induk Utama --</option>
                {parents.map((p: any) => (
                  <option value={p.id} selected={category.parent_id === p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Peruntukan Tipe</label>
              <select name="type" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="product" selected={category.type === 'product'}>Produk PPOB</option>
                <option value="blog" selected={category.type === 'blog'}>Artikel / Blog</option>
              </select>
            </div>

            <div class="md:col-span-2 border-t border-slate-800/60 pt-6 mt-2">
              <label class="block text-xs font-semibold text-slate-500 mb-3">Icon / Logo Brand</label>
              <div class="flex items-center gap-6">
                
                {/* Menampilkan Gambar Current (Saat Ini) */}
                {category.image_url ? (
                  <img src={category.image_url as string} alt="Current Icon" class="w-16 h-16 rounded-xl bg-white object-contain p-2 border border-slate-700 shrink-0 shadow-lg" />
                ) : (
                  <div class="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 shrink-0 shadow-inner">
                     <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                )}
                
                <div class="flex-1">
                  <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-2 text-slate-400 text-sm outline-none transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20" />
                  <p class="text-[10px] text-slate-500 mt-2 leading-relaxed">Pilih gambar baru jika ingin mengganti icon saat ini. <br/>Biarkan kosong jika tidak ingin mengubah gambar.</p>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-6 shadow-lg shadow-blue-500/20">
            Simpan Perubahan Kategori
          </button>
        </form>
      </div>
    </div>,
    { title: 'Edit Kategori' }
  )
})
