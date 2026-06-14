import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const productId = c.req.param('id')
  
  const product = await c.env.DB.prepare(`SELECT id, name, price, order_type FROM products WHERE id = ?`).bind(productId).first()
  if (!product) return c.html(<h1>Produk tidak ditemukan</h1>, 404)

  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-2xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center gap-4">
        <a href="javascript:history.back()" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Checkout Transaksi</h1>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
          {errorMsg === 'saldo_kurang' ? 'Saldo Anda tidak mencukupi untuk transaksi ini.' : 'Terjadi kesalahan sistem.'}
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
        <div class="flex justify-between items-center border-b border-slate-800/60 pb-4 mb-6">
          <h2 class="text-lg font-bold text-slate-200">{product.name}</h2>
          <span class="text-xl font-black text-emerald-400">Rp {product.price.toLocaleString('id-ID')}</span>
        </div>

        <form method="POST" action="/api/user/v1/order/create" class="space-y-6">
          <input type="hidden" name="product_id" value={product.id as number} />
          
          <div>
            <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
              {product.order_type === 'prepaid' ? 'Nomor Tujuan / ID Game' : 'Nomor Pelanggan Tagihan'}
            </label>
            <input type="text" name="customer_number" required placeholder="Contoh: 08123456789 atau 12345678(1234)" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-4 text-slate-200 outline-none font-medium text-lg" />
          </div>

          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-colors">
            Bayar Sekarang
          </button>
        </form>
      </div>
    </div>,
    { title: 'Checkout Order' }
  )
})
