import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const { results: providers } = await c.env.DB.prepare(`SELECT id, name, api_endpoint, status FROM providers ORDER BY id DESC`).all()

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Koneksi Provider (H2H)</h1>
          <p class="text-sm text-slate-400">Kelola sambungan API ke supplier seperti Digiflazz, VIP, dll.</p>
        </div>
        <a href="/admin/providers/new" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 shadow-lg shadow-blue-500/20">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          Tambah Provider Baru
        </a>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60">
              <tr>
                <th class="px-6 py-4">ID</th>
                <th class="px-6 py-4">Nama Provider</th>
                <th class="px-6 py-4">Endpoint API</th>
                <th class="px-6 py-4">Status</th>
                <th class="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              {providers.length > 0 ? providers.map((p: any) => (
                <tr class="hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-4 font-mono text-xs text-slate-500">{p.id}</td>
                  <td class="px-6 py-4 font-bold text-slate-200">{p.name}</td>
                  <td class="px-6 py-4 font-mono text-[10px] text-slate-400">{p.api_endpoint}</td>
                  <td class="px-6 py-4">
                    <span class={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${p.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <a href={`/admin/providers/${p.id}`} class="px-3 py-1.5 bg-[#121217] border border-slate-800 hover:border-blue-500 hover:text-blue-400 rounded-lg text-xs font-medium transition-colors inline-block">Edit Kredensial</a>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} class="px-6 py-12 text-center text-slate-500">Belum ada provider yang dikonfigurasi.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    { title: 'Provider H2H' }
  )
})
