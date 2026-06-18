import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const categoryId = c.req.param('id')

  // 1. Ambil data rincian kategori saat ini dari database
  const category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(categoryId).first()

  if (!category) {
    return c.render(
      <div class="max-w-2xl mx-auto p-10 text-center mt-12 bg-[#18181b] border border-slate-800/60 rounded-2xl shadow-xl">
         <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
         </div>
         <h1 class="text-xl font-bold text-slate-100 mb-2">Kategori Tidak Ditemukan</h1>
         <p class="text-sm text-slate-400 mb-6">Kategori dengan ID #{categoryId} tidak tersedia di sistem.</p>
         <a href="/admin/categories" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors">Kembali ke List</a>
      </div>,
      { title: 'Kategori Tidak Ditemukan' }
    )
  }

  // 2. Ambil daftar kategori utama untuk opsi "Kategori Induk" (Kecuali ID kategori ini sendiri agar tidak looping)
  const { results: parents } = await c.env.DB.prepare(
    `SELECT id, name FROM categories WHERE parent_id IS NULL AND id != ? ORDER BY name ASC`
  ).bind(categoryId).all()

  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      {/* HEADER PAGE */}
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/categories" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-800/60">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Edit Kategori / Brand</h1>
          <p class="text-sm text-slate-400">Ubah nama, struktur posisi induk, serta unggah ulang icon logo brand.</p>
        </div>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium shadow-sm">
          Gagal memperbarui data kategori. Silakan periksa kembali berkas Anda.
        </div>
      )}

      {/* FORM UTAMA */}
      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8 shadow-sm">
        <form method="POST" action={`/api/admin/v1/categories/${category.id}/update`} enctype="multipart/form-data" class="space-y-6">
          
          {/* Pratinjau Gambar Icon Kategori Saat Ini */}
          {category.image_url && (
            <div class="p-4 rounded-xl border border-slate-800 bg-[#121217] w-fit">
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Icon / Logo Aktif</label>
              <img src={category.image_url as string} alt={category.name as string} class="w-16 h-16 rounded-xl object-contain bg-white p-1 border border-slate-700 shadow-sm" />
            </div>
          )}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nama Kategori / Brand</label>
              <input type="text" name="name" value={category.name as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors text-sm" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Posisikan Sebagai Sub-Brand Dari</label>
              <select name="parent_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                <option value="">-- Jadikan Induk Utama (Level 1) --</option>
                {parents.map((p: any) => (
                  <option value={p.id} selected={p.id === category.parent_id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 border-t border-slate-800/60 pt-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ganti Berkas Gambar / Icon Baru</label>
              <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-2 text-slate-400 outline-none text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20 transition-all cursor-pointer" />
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm">
            Simpan Perubahan Kategori
          </button>
        </form>
      </div>

    </div>,
    { title: 'Edit Kategori' }
  )
})
