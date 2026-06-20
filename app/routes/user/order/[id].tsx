import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../../src/services/wallet'

export default createRoute(async (c) => {
  const id = c.req.param('id')
  const user = c.get('user')!
  
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // Ambil detail produk berserta data kategori induknya
  const product = await c.env.DB.prepare(`
    SELECT p.*, c.name as category_name, c.image_url as category_image 
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).bind(id).first()

  if (!product) return c.notFound()

  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-2xl mx-auto space-y-6 pb-12">
      
      {/* HEADER NAVIGASI & WALLET */}
      <div class="flex items-center gap-4 px-1">
        <a href="javascript:history.back()" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors text-slate-600">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </a>
        <h1 class="text-xl font-bold text-slate-800">Detail Transaksi</h1>
      </div>

      <div class="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-3xl p-6 text-white shadow-lg flex items-center justify-between">
        <div>
          <p class="text-indigo-100 text-sm font-medium mb-1">Saldo Anda Saat Ini</p>
          <h2 class="text-2xl font-bold tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
        </div>
        <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        </div>
      </div>

      {/* FORM PEMESANAN */}
      <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-6 md:p-8">
          
          {/* Info Produk */}
          <div class="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            {product.category_image && (
               <img src={product.category_image as string} alt={product.category_name as string} class="w-14 h-14 object-contain p-1 bg-slate-50 rounded-xl border border-slate-100" />
            )}
            <div>
               <h1 class="text-lg md:text-xl font-bold text-slate-800 leading-tight">{product.name}</h1>
               <p class="text-sm text-slate-500 mt-1">{product.category_name} &bull; {product.order_type === 'inquiry' ? 'Tagihan Pascabayar' : 'Topup Otomatis'}</p>
            </div>
          </div>

          {errorMsg && (
            <div class="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-2">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {errorMsg}
            </div>
          )}

          {/* Pastikan action form diarahkan ke endpoint proses order Anda */}
          <form action="/api/user/v1/transaction/create" method="POST" class="space-y-6" id="orderForm">
            <input type="hidden" name="product_id" value={product.id as number} />
            
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 ml-1">Nomor Tujuan / ID Pelanggan</label>
              <input type="text" name="customer_number" required placeholder="Contoh: 081234567890 / ID Akun" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-slate-400" />
              {product.description && (
                <p class="text-[11px] text-slate-500 ml-1 mt-1 leading-relaxed">{product.description}</p>
              )}
            </div>

            {/* 💡 LOGIKA UI OPEN AMOUNT (BEBAS NOMINAL) */}
            {product.is_open_amount === 1 ? (
              <div class="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <label class="text-sm font-bold text-slate-700 ml-1">Nominal Topup (Rupiah)</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                  <input type="number" name="amount" id="inputAmount" min="1000" required placeholder="Ketik nominal..." class="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-lg font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                </div>
                <div class="flex justify-between items-center px-1 pt-3 border-t border-slate-200/60 mt-3">
                  <span class="text-sm text-slate-500">Biaya Layanan (Admin)</span>
                  <span class="text-sm font-bold text-slate-700" id="adminFee" data-fee={product.price}>+ Rp {Number(product.price).toLocaleString('id-ID')}</span>
                </div>
              </div>
            ) : (
              <div class="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 flex justify-between items-center">
                <span class="font-medium text-indigo-900">Total Pembayaran</span>
                <span class="text-xl font-bold text-indigo-600">Rp {Number(product.price).toLocaleString('id-ID')}</span>
              </div>
            )}

            <div class="pt-4">
              {product.is_open_amount === 1 ? (
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 flex justify-between items-center px-6">
                  <span>Bayar Sekarang</span>
                  <span id="totalDisplay" class="text-xl bg-white/20 px-3 py-1 rounded-xl">Rp 0</span>
                </button>
              ) : (
                <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg">
                  Beli Sekarang
                </button>
              )}
            </div>
          </form>

          {/* ⚡ JAVASCRIPT: Kalkulator Real-time Bebas Nominal */}
          {product.is_open_amount === 1 && (
            <script dangerouslySetInnerHTML={{__html: `
              const input = document.getElementById('inputAmount');
              const totalDisplay = document.getElementById('totalDisplay');
              const adminFee = parseInt(document.getElementById('adminFee').getAttribute('data-fee')) || 0;
              
              input.addEventListener('input', (e) => {
                const val = parseInt(e.target.value) || 0;
                const total = val > 0 ? (val + adminFee) : 0;
                totalDisplay.innerText = 'Rp ' + total.toLocaleString('id-ID');
              });
            `}} />
          )}

        </div>
      </div>
    </div>
  )
})
