import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Query untuk mengambil data user beserta saldo di dompetnya
  const query = `
    SELECT u.id, u.name, u.email, u.role, u.created_at, 
           w.balance_available, w.balance_pending
    FROM users u
    LEFT JOIN wallets w ON u.id = w.user_id
    ORDER BY u.id DESC
  `
  const { results: members } = await c.env.DB.prepare(query).all()

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Data Member</h1>
          <p class="text-sm text-slate-400">Manajemen pengguna dan pantauan saldo dompet.</p>
        </div>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60">
              <tr>
                <th class="px-6 py-4">ID</th>
                <th class="px-6 py-4">Pengguna</th>
                <th class="px-6 py-4">Role</th>
                <th class="px-6 py-4">Saldo Tersedia</th>
                <th class="px-6 py-4">Bergabung</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              {members.map((member: any) => (
                <tr class="hover:bg-slate-800/30 transition-colors">
                  <td class="px-6 py-4 font-mono text-xs text-slate-500">#{member.id}</td>
                  <td class="px-6 py-4">
                    <p class="font-bold text-slate-200">{member.name}</p>
                    <p class="text-[10px] text-slate-500">{member.email}</p>
                  </td>
                  <td class="px-6 py-4">
                    <span class={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${member.role === 'admin' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-slate-800 text-slate-400'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td class="px-6 py-4 font-semibold text-emerald-400">
                    Rp {Number(member.balance_available || 0).toLocaleString('id-ID')}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-xs text-slate-400">
                    {new Date(member.created_at).toLocaleDateString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>,
    { title: 'Data Member' }
  )
})
