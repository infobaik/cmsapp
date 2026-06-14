import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/gateways" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Tambah Payment Gateway</h1>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8">
        <form method="POST" action="/api/admin/v1/gateways/create" class="space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Nama Layanan / Provider</label>
              <input type="text" name="name" required placeholder="Contoh: Gopay Merchant / Midtrans" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Kode Internal (Tanpa Spasi)</label>
              <input type="text" name="code" required placeholder="Contoh: gopay_qris" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>

            <div class="md:col-span-2 border-t border-slate-800/60 pt-6">
              <h2 class="text-sm font-bold text-slate-200 mb-4">Kredensial API (Rahasia)</h2>
              <div class="space-y-6">
                <div>
                  <label class="block text-xs font-semibold text-amber-500 mb-2">Merchant ID / API Key</label>
                  <input type="text" name="api_key" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-amber-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-amber-500 mb-2">API Secret / Server Key</label>
                  <input type="password" name="api_secret" class="w-full bg-[#121217] border border-slate-800/60 focus:border-amber-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" placeholder="Kosongkan jika tidak diperlukan" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-4">
            Simpan Konfigurasi Pembayaran
          </button>
        </form>
      </div>
    </div>,
    { title: 'Tambah Payment Gateway' }
  )
})
