import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Tarik data tiket deposit yang berstatus pending, join dengan tabel users
  const query = `
    SELECT d.id, d.amount, d.status, d.created_at, u.name, u.email 
    FROM deposits d
    JOIN users u ON d.user_id = u.id
    WHERE d.status = 'pending'
    ORDER BY d.created_at ASC
  `
  const { results: deposits } = await c.env.DB.prepare(query).all()

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Validasi Deposit</h1>
          <p class="text-sm text-slate-400">Daftar tiket deposit member yang menunggu persetujuan Anda.</p>
        </div>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60">
              <tr>
                <th class="px-6 py-4">ID Tiket</th>
                <th class="px-6 py-4">Member</th>
                <th class="px-6 py-4">Nominal</th>
                <th class="px-6 py-4">Tanggal</th>
                <th class="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              {deposits.length > 0 ? deposits.map((dep: any) => (
                  <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-4 font-mono text-xs font-bold text-amber-400">{dep.id}</td>
                    <td class="px-6 py-4">
                      <p class="font-medium text-slate-200">{dep.name}</p>
                      <p class="text-[10px] text-slate-500">{dep.email}</p>
                    </td>
                    <td class="px-6 py-4 font-bold text-emerald-400">Rp {dep.amount.toLocaleString('id-ID')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-400">{new Date(dep.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' })}</td>
                    <td class="px-6 py-4 flex items-center justify-end gap-2">
                      <form method="POST" action={`/api/admin/v1/deposits/${dep.id}/approve`}>
                        <button type="submit" class="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-medium transition-colors">Setujui</button>
                      </form>
                      <form method="POST" action={`/api/admin/v1/deposits/${dep.id}/reject`}>
                        <button type="submit" class="px-3 py-1.5 bg-red-600/20 text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white rounded-lg text-xs font-medium transition-colors">Tolak</button>
                      </form>
                    </td>
                  </tr>
                )) : (
                <tr>
                  <td colSpan={5} class="px-6 py-12 text-center text-slate-500">Tidak ada tiket deposit yang tertunda.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    { title: 'Validasi Deposit' }
  )
})
