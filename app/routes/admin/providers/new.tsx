import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/providers" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Tambah Provider H2H Baru</h1>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6">
          Gagal menyimpan provider. Pastikan data diisi dengan benar.
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 p-6 md:p-8 rounded-2xl shadow-xl">
        <form method="POST" action="/api/admin/v1/providers/create" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Provider</label>
              <input type="text" name="name" required placeholder="Contoh: Digiflazz / OkeConnect" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">URL Endpoint API</label>
              <input type="url" name="api_endpoint" required placeholder="Contoh: https://api.digiflazz.com/v1" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">API Key / Member ID (Username)</label>
              <input type="text" name="api_key" required placeholder="Masukkan Username/API Key/Member ID" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">API Secret / PIN (Katakunci)</label>
              <input type="password" name="api_secret" placeholder="Masukkan PIN/API Secret" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>

            <div class="md:col-span-2 border-t border-slate-800/60 pt-6 mt-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Universal Proxy URL (Opsional)</label>
              <input type="url" name="proxy_url" placeholder="Contoh: https://proxy.domain.com/fetch" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
              <p class="text-[10px] text-slate-500 mt-2">Gunakan proxy hanya jika IP Server Anda diblokir oleh Provider tujuan.</p>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-6 shadow-lg shadow-blue-500/20">
            Simpan Provider Baru
          </button>
        </form>
      </div>
    </div>,
    { title: 'Tambah Provider' }
  )
})
