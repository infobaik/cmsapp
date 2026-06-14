import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Ambil data untuk opsi dropdown
  const { results: categories } = await c.env.DB.prepare(`SELECT id, name FROM categories WHERE type = 'product'`).all()
  const { results: providers } = await c.env.DB.prepare(`SELECT id, name FROM providers WHERE status = 'active'`).all()

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/products" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Tambah Produk Baru</h1>
        </div>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8">
        {/* Pastikan enctype multipart/form-data ada karena kita mengunggah gambar ke Cloudinary */}
        <form method="POST" action="/api/admin/v1/products/create" enctype="multipart/form-data" class="space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Nama Produk Lengkap</label>
              <input type="text" name="name" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Harga Jual (Rp)</label>
              <input type="number" name="price" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Pilih Kategori</label>
              <select name="category_id" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                {categories.map((cat: any) => <option value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Tipe Transaksi (Order Type)</label>
              <select name="order_type" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="prepaid">Prepaid (Topup/Pulsa)</option>
                <option value="postpaid">Postpaid (Tagihan PPOB)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <div>
              <label class="block text-xs font-semibold text-blue-400 mb-2">Provider H2H (Supplier)</label>
              <select name="provider_id" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                {providers.map((prov: any) => <option value={prov.id}>{prov.name}</option>)}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-blue-400 mb-2">Kode SKU Provider (Penting!)</label>
              <input type="text" name="provider_product_code" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" placeholder="Contoh: ML100" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800/60 pt-6">
             <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Manajemen Stok</label>
              <select name="stock_type" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                <option value="general">Umum (Tidak Terbatas / API)</option>
                <option value="unique">Unik (Lisensi/Voucher Sekali Pakai)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Gambar Produk (Opsional)</label>
              <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-2.5 text-slate-400 outline-none text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 hover:file:bg-blue-500/20" />
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-4">
            Simpan Produk Baru
          </button>
        </form>
      </div>

    </div>,
    { title: 'Tambah Produk' }
  )
})
