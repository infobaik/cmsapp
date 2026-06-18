import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const paramId = c.req.param('id')
  const categoryId = Number(paramId)

  if (isNaN(categoryId)) {
     return c.render(
        <div class="max-w-2xl mx-auto p-10 text-center">
          <h1 class="text-2xl font-bold text-slate-100">Format Brand Tidak Valid</h1>
        </div>,
        { title: 'Error' }
     )
  }

  // Mengambil nama dan GAMBAR dari Kategori/Brand
  const category = await c.env.DB.prepare(`SELECT name, image_url FROM categories WHERE id = ?`).bind(categoryId).first()
  
  if (!category) {
    return c.render(
      <div class="max-w-2xl mx-auto p-10 text-center mt-12 bg-[#18181b] border border-slate-800/60 rounded-2xl shadow-xl">
         <div class="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
         </div>
         <h1 class="text-xl font-bold text-slate-100 mb-2">Brand Tidak Ditemukan</h1>
         <p class="text-sm text-slate-400 mb-6">Brand dengan ID #{paramId} tidak tersedia di sistem.</p>
         <a href="/user/dashboard" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors">Kembali ke Dashboard</a>
      </div>,
      { title: 'Brand Tidak Ditemukan' }
    )
  }

  const { results: products } = await c.env.DB.prepare(`SELECT id, name, price, order_type FROM products WHERE category_id = ? AND status = 'active' ORDER BY price ASC`).bind(categoryId).all()

  // Gambar Default jika Brand belum dipasang gambar oleh Admin
  const defaultIcon = "https://ui-avatars.com/api/?name=" + encodeURIComponent(category.name as string) + "&background=0D8BFF&color=fff&rounded=true&bold=true";
  const brandImage = category.image_url || defaultIcon;

  return c.render(
    <div class="max-w-6xl mx-auto">
      
      <div class="mb-6 flex items-center gap-4 border-b border-slate-800/60 pb-5">
        <a href="/user/dashboard" class="p-2.5 bg-[#18181b] border border-slate-800/60 rounded-xl text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div class="flex items-center gap-4">
          <img src={brandImage as string} alt={category.name as string} class="w-12 h-12 rounded-full object-contain bg-white shadow-lg p-1 border border-slate-800" />
          <div>
            <h1 class="text-2xl font-bold text-slate-100 tracking-tight">{category.name}</h1>
            <p class="text-[11px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Pilih Produk Untuk Melanjutkan</p>
          </div>
        </div>
      </div>

      {products.length > 0 ? (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {products.map((p: any) => (
            <a href={`/user/order/${p.id}`} class="bg-[#18181b] border border-slate-800/60 p-5 rounded-2xl flex flex-col h-full hover:border-emerald-500/50 hover:bg-[#1a1a1f] transition-all group shadow-sm hover:shadow-emerald-500/5 cursor-pointer relative overflow-hidden">
              
              {/* Badge Tipe */}
              <div class="absolute top-0 right-0 bg-slate-800/50 px-3 py-1 rounded-bl-xl text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-l border-slate-800/60">
                 {p.order_type === 'prepaid' ? 'Topup' : 'Tagihan'}
              </div>

              <div class="flex items-start gap-4 mb-4 mt-2">
                <img src={brandImage as string} alt="Brand" class="w-10 h-10 rounded-lg object-contain bg-white/10 p-1 shrink-0" />
                <h3 class="text-sm font-semibold text-slate-200 leading-snug group-hover:text-emerald-400 transition-colors">{p.name}</h3>
              </div>
              
              <div class="mt-auto pt-4 border-t border-slate-800/60 flex items-center justify-between">
                <div>
                   <p class="text-[10px] text-slate-500 font-medium mb-0.5">Harga Sistem</p>
                   <span class="text-emerald-400 font-black text-lg tracking-tight">Rp {p.price.toLocaleString('id-ID')}</span>
                </div>
                <div class="w-8 h-8 rounded-full bg-[#121217] border border-slate-700 flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 group-hover:text-white text-slate-500 transition-colors">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <div class="text-center py-24 bg-[#18181b] border border-slate-800/60 rounded-2xl shadow-xl">
          <svg width="48" height="48" class="mx-auto text-slate-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          <p class="text-slate-400 font-medium">Belum ada produk aktif di Brand ini.</p>
        </div>
      )}
    </div>,
    { title: `Brand: ${category.name}` }
  )
})
