import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const id = c.req.param('id')
  
  // Ambil data kategori yang sedang diedit
  const category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(id).first()
  if (!category) return c.notFound()

  // Ambil data parent (hindari memilih dirinya sendiri sebagai parent)
  const { results: parents } = await c.env.DB.prepare(`SELECT id, name, type FROM categories WHERE parent_id IS NULL AND id != ?`).bind(id).all()

  return c.render(
    <div class="max-w-3xl mx-auto space-y-6">
      <div class="flex items-center gap-4 mb-6">
        <a href="/admin/categories" class="text-slate-400 hover:text-white">← Kembali</a>
        <h1 class="text-2xl font-bold text-slate-100">Edit Kategori: {category.name}</h1>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl">
        <form method="POST" action={`/api/admin/v1/categories/${id}/update`} enctype="multipart/form-data" class="space-y-4">
          
          {/* Tampilkan Icon Saat Ini jika ada */}
          {category.image_url && (
            <div class="mb-4">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Icon Saat Ini</label>
              <img src={category.image_url as string} alt="Current Icon" class="w-16 h-16 rounded-xl border border-slate-700 object-cover bg-white p-1" />
              <input type="hidden" name="current_image_url" value={category.image_url} />
            </div>
          )}

          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Upload Icon Baru (Opsional)</label>
            {/* PERBAIKAN MUTLAK: name wajib "image", BUKAN "icon" */}
            <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-2 text-slate-200 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600 hover:file:text-white transition-all" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Kategori</label>
            <input type="text" name="name" value={category.name as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Slug URL</label>
            <input type="text" name="slug" value={category.slug as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-400 text-sm outline-none" />
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Peruntukan Tipe</label>
            <select name="type" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
              <option value="product" selected={category.type === 'product'}>Katalog Produk</option>
              <option value="blog" selected={category.type === 'blog'}>Artikel / Blog</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kategori Induk</label>
            <select name="parent_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
              <option value="">-- Tidak Ada (Jadikan Parent) --</option>
              {parents.map((p: any) => (
                <option value={p.id} selected={category.parent_id === p.id}>{p.name} ({p.type})</option>
              ))}
            </select>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl transition-colors mt-4">
            Simpan Perubahan
          </button>
        </form>
      </div>
    </div>,
    { title: `Edit Kategori - ${category.name}` }
  )
})
