import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Mengambil data provider untuk dropdown
  const { results: providers } = await c.env.DB.prepare(`SELECT id, name FROM providers WHERE status = 'active'`).all()

  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/products" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Batch Sync JSON (OkeConnect)</h1>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6">
          {errorMsg.replace(/\+/g, ' ')}
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8">
        <form method="POST" action="/api/admin/v1/products/sync-okeconnect" class="space-y-6">
          
          <div class="grid grid-cols-1 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Target Provider H2H</label>
              <select name="provider_id" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                {providers.map((prov: any) => <option value={prov.id}>{prov.name}</option>)}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">URL JSON Price List</label>
              <input type="url" name="json_url" required value="https://okeconnect.com/harga/json?id=905ccd028329b0a" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-emerald-400 mb-2">Margin Profit (Tambahan Harga Jual)</label>
              <input type="number" name="profit_margin" value="500" required class="w-full bg-emerald-500/5 border border-emerald-500/20 focus:border-emerald-500/50 rounded-xl p-3 text-emerald-400 outline-none font-bold" />
              <p class="text-[11px] text-slate-500 mt-2">Harga jual produk akan otomatis dihitung dari: Harga Asli Provider + Margin Profit yang Anda masukkan di atas.</p>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-4">
            Mulai Sinkronisasi Ribuan Data
          </button>
        </form>
      </div>
    </div>,
    { title: 'Sync JSON Provider' }
  )
})
