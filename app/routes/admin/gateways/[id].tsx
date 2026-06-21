import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const id = c.req.param('id')
  
  // Ambil data spesifik gateway dari database
  const gateway = await c.env.DB.prepare(`SELECT * FROM payment_gateways WHERE id = ?`).bind(id).first()

  if (!gateway) return c.notFound()

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/gateways" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Edit Gateway: {gateway.name}</h1>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8">
        <form method="POST" action={`/api/admin/v1/gateways/${id}/update`} class="space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Nama Layanan</label>
              <input type="text" name="name" value={gateway.name} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2">Kode Internal</label>
              <input type="text" name="code" value={gateway.code} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>

            <div class="md:col-span-2">
              <label class="block text-xs font-semibold text-amber-500 mb-2">URL Base Endpoint API</label>
              <input type="url" name="api_endpoint" value={gateway.api_endpoint || ''} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-amber-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" />
            </div>

            <div class="md:col-span-2 border-t border-slate-800/60 pt-6">
              <h2 class="text-sm font-bold text-slate-200 mb-4">Kredensial API</h2>
              <div class="space-y-6">
                <div>
                  <label class="block text-xs font-semibold text-amber-500 mb-2">API Key / Merchant ID</label>
                  <input type="text" name="api_key" value={gateway.api_key} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-amber-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" />
                </div>
                <div>
                  <label class="block text-xs font-semibold text-amber-500 mb-2">Secret Key / Server Key</label>
                  <input type="password" name="secret_key" value={gateway.secret_key} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-amber-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono" />
                </div>
              </div>
            </div>

            <div class="md:col-span-2 border-t border-slate-800/60 pt-6">
               <label class="block text-xs font-semibold text-slate-500 mb-2">Status Gateway</label>
               <select name="status" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none">
                  <option value="active" selected={gateway.status === 'active'}>Aktif (Gunakan Gateway Ini)</option>
                  <option value="inactive" selected={gateway.status === 'inactive'}>Tidak Aktif (Matikan)</option>
               </select>
               <p class="text-[10px] text-slate-500 mt-2">*Hanya boleh ada 1 gateway berstatus AKTIF dalam satu waktu.</p>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors mt-4">
            Simpan Perubahan Gateway
          </button>
        </form>
      </div>
    </div>,
    { title: 'Edit Payment Gateway' }
  )
})
