import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const providerId = c.req.param('id')

  // Ambil data provider dari D1
  const provider = await c.env.DB.prepare(`SELECT * FROM providers WHERE id = ?`).bind(providerId).first()

  if (!provider) {
    // PERBAIKAN: Wajib menggunakan 'return' agar Promise resolved!
    return c.render(
      <div class="max-w-2xl mx-auto p-10 text-center mt-12 bg-[#18181b] border border-slate-800/60 rounded-2xl shadow-xl">
         <div class="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
           <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
         </div>
         <h1 class="text-xl font-bold text-slate-100 mb-2">Provider Tidak Ditemukan</h1>
         <p class="text-sm text-slate-400 mb-6">Data provider dengan ID tersebut tidak ada.</p>
         <a href="/admin/providers" class="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl">Kembali</a>
      </div>,
      { title: 'Provider Tidak Ditemukan' }
    )
  }

  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  // PERBAIKAN: Wajib menggunakan 'return' pada render utama
  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      
      {/* HEADER NAVIGASI */}
      <div class="mb-6 flex items-center gap-4">
        <a href="/admin/providers" class="p-2 bg-[#18181b] rounded-lg text-slate-400 hover:text-white border border-slate-800/60 transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Edit Provider H2H</h1>
          <p class="text-sm text-slate-400">Atur Endpoint, Proxy, API Key, dan Secret (PIN|Password).</p>
        </div>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium">Data berhasil diperbarui!</div>
      )}
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">Gagal menyimpan perubahan.</div>
      )}

      {/* FORM UTAMA */}
      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 md:p-8 shadow-sm">
        <form method="POST" action={`/api/admin/v1/providers/${provider.id}/update`} class="space-y-6">
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Nama Provider</label>
              <input type="text" name="name" value={provider.name as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Status Operasional</label>
              <select name="status" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none cursor-pointer text-sm">
                <option value="active" selected={provider.status === 'active'}>Aktif (Bisa Digunakan)</option>
                <option value="inactive" selected={provider.status === 'inactive'}>Nonaktif (Dihentikan Sementara)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 gap-6 border-t border-slate-800/60 pt-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">API Endpoint URL</label>
              <input type="url" name="api_endpoint" value={provider.api_endpoint as string} required placeholder="Cth: https://h2h.okeconnect.com/trx" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm font-mono" />
              <p class="text-[10px] text-slate-500 mt-1.5">Titik tujuan akhir API Server H2H.</p>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">URL Proxy Gateway (Opsional)</label>
              <input type="url" name="proxy_url" value={provider.proxy_url as string || ''} placeholder="Cth: https://relay-5tew.onrender.com/proxy" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none text-sm font-mono" />
              <p class="text-[10px] text-amber-500/80 mt-1.5 font-medium">Jika diisi, semua koneksi ke API Endpoint akan dilewatkan melalui Proxy ini untuk mengatasi blokir WAF/IP Whitelist.</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800/60 pt-6">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">API Key / Member ID</label>
              <input type="text" name="api_key" value={provider.api_key as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">API Secret (PIN / Password)</label>
              <input type="text" name="api_secret" value={provider.api_secret as string} required class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 rounded-xl p-3 text-slate-200 outline-none font-mono text-sm" />
              <p class="text-[10px] text-slate-400 mt-1.5 bg-slate-800/40 p-2 rounded-lg border border-slate-800">
                <strong>Format Khusus (OkeConnect):</strong> Gunakan tanda pipa (|) untuk menggabungkan PIN dan Password. <br/>
                <span class="text-blue-400 font-mono mt-1 block">Contoh: 123456|KataSandiSaya123</span>
              </p>
            </div>
          </div>

          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 mt-4 text-sm">
            Simpan Konfigurasi Provider
          </button>
        </form>
      </div>

    </div>,
    { title: 'Edit Provider' }
  )
})
