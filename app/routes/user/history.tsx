import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const user = c.get('user')!
  
  // Query riwayat transaksi user
  const query = `
    SELECT t.id, t.total_price, t.status, t.created_at, p.name as product_name
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    WHERE t.user_id = ?
    ORDER BY t.created_at DESC LIMIT 20
  `
  const { results: transactions } = await c.env.DB.prepare(query).bind(user.id).all()

  return c.render(
    <div class="max-w-6xl mx-auto">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Riwayat Transaksi</h1>
        <p class="text-sm text-slate-400">Daftar 20 transaksi terakhir Anda.</p>
      </div>

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/50 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60">
              <tr>
                <th class="px-6 py-4">ID Transaksi</th>
                <th class="px-6 py-4">Produk</th>
                <th class="px-6 py-4">Tanggal</th>
                <th class="px-6 py-4">Total</th>
                <th class="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              {transactions.length > 0 ? transactions.map((trx: any) => {
                // Formatting Status Color
                let statusClass = 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                if (trx.status === 'success') statusClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                if (trx.status === 'failed') statusClass = 'bg-red-500/10 text-red-400 border-red-500/20'
                if (trx.status === 'processing' || trx.status === 'waiting_payment') statusClass = 'bg-amber-500/10 text-amber-400 border-amber-500/20'

                return (
                  <tr class="hover:bg-slate-800/30 transition-colors">
                    <td class="px-6 py-4 font-mono text-xs text-slate-400">{trx.id.substring(0, 8)}...</td>
                    <td class="px-6 py-4 font-medium text-slate-200">{trx.product_name}</td>
                    <td class="px-6 py-4 whitespace-nowrap">{new Date(trx.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}</td>
                    <td class="px-6 py-4 font-semibold text-slate-200">Rp {trx.total_price.toLocaleString('id-ID')}</td>
                    <td class="px-6 py-4">
                      <span class={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase border tracking-wider ${statusClass}`}>
                        {trx.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan={5} class="px-6 py-12 text-center text-slate-500">Belum ada transaksi sama sekali.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>,
    { title: 'Riwayat Transaksi' }
  )
})
