import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const categoryId = c.req.param('id')
  
  // Ambil nama kategori
  const category = await c.env.DB.prepare(`SELECT name FROM categories WHERE id = ?`).bind(categoryId).first()
  if (!category) return c.html(<h1>Kategori tidak ditemukan</h1>, 404)

  // Ambil daftar produk
  const { results: products } = await c.env.DB.prepare(`SELECT id, name, price, order_type FROM products WHERE category_id = ? AND status = 'active' ORDER BY price ASC`).bind(categoryId).all()

  return c.render(
    <div class="max-w-6xl mx-auto">
      <div class="mb-6 flex items-center gap-4 border-b border-slate-800/60 pb-4">
        <a href="/user/dashboard" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-100">{category.name}</h1>
          <p class="text-sm text-slate-400">Pilih produk yang ingin Anda beli.</p>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        {products.map((p: any) => (
          <div class="bg-[#18181b] border border-slate-800/60 p-4 rounded-2xl flex flex-col h-full">
            <h3 class="text-sm font-bold text-slate-200 mb-2">{p.name}</h3>
            <p class="text-xs text-slate-500 mb-4">{p.order_type === 'prepaid' ? 'Produk Langsung' : 'Pascabayar (Tagihan)'}</p>
            <div class="mt-auto pt-4 border-t border-slate-800/60 flex items-center justify-between">
              <span class="text-emerald-400 font-bold text-sm">Rp {p.price.toLocaleString('id-ID')}</span>
              <a href={`/user/order/${p.id}`} class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
                Beli
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>,
    { title: `Kategori: ${category.name}` }
  )
})
