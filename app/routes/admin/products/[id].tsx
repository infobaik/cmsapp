import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const productId = c.req.param('id')
  
  // Ambil data produk spesifik
  const product = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(productId).first()
  
  if (!product) {
    return c.render(
      <div class="max-w-2xl mx-auto p-10 text-center mt-12 bg-[#18181b] border border-slate-800/60 rounded-2xl shadow-xl">
         <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
         </div>
         <h1 class="text-xl font-bold text-slate-100 mb-2">Produk Tidak Ditemukan</h1>
         <p class="text-sm text-slate-400 mb-6">Produk dengan ID #{productId} tidak tersedia di sistem.</p>
         <a href="/admin/products" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors">Kembali ke Katalog</a>
      </div>,
      { title: 'Produk Tidak Ditemukan' }
    )
  }

  // PERBAIKAN SAKTI: Mengambil data semua kategori tanpa filter 'type = 'product'' agar database tidak crash
  const { results: categories } = await c.env.DB.prepare(`SELECT id, name FROM categories ORDER BY name ASC`).all()

  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/products" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors border border-slate-800/60">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Edit Produk</h1>
          <p class="text-sm text-slate-400">Ubah rincian, status, jenis transaksi, dan gambar layanan.</p>
        </div>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium shadow-sm">
          Data produk berhasil diperbarui!
        </div>
      )}
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium shadow-sm">
          Gagal memperbarui produk: {decodeURIComponent(errorMsg)}
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8 shadow-sm">
        <form method="POST" action={`/api/admin/v1/products/${product.id}/update`} enctype="multipart/form-data" class="space-y-6">
          
          {/* Pratinjau Gambar Saat Ini */}
          {product.image_url && (
            <div class="p-4 rounded-xl border border-slate-800 bg-[#121217] w-fit">
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Gambar Produk Saat Ini</label>
              <img src={product.image_url as string} alt={product.name as string} class="w-24 h-24 rounded-xl object-cover bg-white/10 p-1 border border-slate-700 shadow-inner" />
            </div>
          )}

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nama Produk Lengkap</label>
              <input type="text" name="name" value={product.name as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Harga Jual (Rp)</label>
              <input type="number" name="price" value={product.price as number} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors text-sm" />
            </div>
          </div>

          {/* KOLOM KETERANGAN TAMBAHAN DARI JSON */}
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Keterangan / Deskripsi Produk</label>
              <textarea name="description" rows={3} class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none transition-colors text-sm">{product.description as string || ''}</textarea>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Pilih Kategori / Brand</label>
              <select name="category_id" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                {categories.map((cat: any) => (
                  <option value={cat.id} selected={cat.id === product.category_id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Tipe Alur Transaksi (Order Type)</label>
              <select name="order_type" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                <option value="prepaid" selected={product.order_type === 'prepaid'}>Prepaid (Prabayar / Topup Putus)</option>
                <option value="postpaid" selected={product.order_type === 'postpaid'}>Postpaid (Pascabayar / Eksekusi Bayar)</option>
                <option value="inquiry" selected={product.order_type === 'inquiry'}>Inquiry (Pascabayar / Cek Tagihan)</option>
              </select>
            </div>
          </div>

          {/* Sifat Immutable Komponen Supplier */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-slate-800 bg-[#121217]/50">
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Provider H2H (Supplier)</label>
              <input type="text" disabled value={`ID Provider: ${product.provider_id}`} class="w-full bg-[#121217] border border-slate-800/40 rounded-xl p-3 text-slate-500 outline-none cursor-not-allowed text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Kode SKU Provider</label>
              <input type="text" disabled value={product.provider_product_code as string} class="w-full bg-[#121217] border border-slate-800/40 rounded-xl p-3 text-slate-500 outline-none font-mono cursor-not-allowed text-sm" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-6 border-t border-slate-800/60 pt-6">
             <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Manajemen Stok</label>
              <select name="stock_type" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                <option value="general" selected={product.stock_type === 'general'}>Umum (API / Unlimited)</option>
                <option value="unique" selected={product.stock_type === 'unique'}>Unik (Voucher / Sekali Pakai)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Status Distribusi Admin</label>
              <select name="status" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                <option value="active" selected={product.status === 'active'}>Aktif (Dijual)</option>
                <option value="inactive" selected={product.status === 'inactive'}>Nonaktif (Sembunyikan)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Visibilitas Katalog User</label>
              <select name="is_visible" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                <option value="1" selected={product.is_visible === 1}>Tampilkan</option>
                <option value="0" selected={product.is_visible === 0}>Sembunyikan (PAY/Komisi)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Ganti Gambar Baru</label>
              <input type="file" name="image" accept="image/*" class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-2 text-slate-400 outline-none text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-500/10 file:text-blue-400 cursor-pointer" />
            </div>
          </div>

          <div class="p-3 bg-[#121217] border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
            <span class="font-bold uppercase tracking-wide text-blue-400 shrink-0">Status Sistem Pusat Provider:</span>
            <span class={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${product.provider_status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
              {product.provider_status}
            </span>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm">
            Simpan Perubahan Data Produk
          </button>
        </form>
      </div>

    </div>,
    { title: 'Edit Produk' }
  )
})
