import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const user = c.get('user')!
  
  const { results: transactions } = await c.env.DB.prepare(`
    SELECT t.id, t.customer_number, t.order_type, t.bill_amount, t.total_price, t.status, t.server_log, t.created_at,
           p.name as product_name
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    WHERE t.user_id = ?
    ORDER BY t.id DESC
    LIMIT 50
  `).bind(user.id).all()

  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Riwayat Transaksi</h1>
          <p class="text-sm text-slate-400">Pantau status pesanan dan hasil pengecekan layanan Anda secara langsung.</p>
        </div>
        <a href="/user/dashboard" class="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-sm font-medium border border-slate-800/60 transition-colors text-center">
          Kembali ke Dashboard
        </a>
      </div>

      {successMsg && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium">
          {successMsg.replace(/_/g, ' ')}
        </div>
      )}
      
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium">
          {errorMsg.replace(/_/g, ' ')}
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm text-slate-300">
            <thead class="bg-slate-900/40 text-xs uppercase font-semibold text-slate-500 border-b border-slate-800/60">
              <tr>
                <th class="px-4 py-4 w-40">Waktu</th>
                <th class="px-4 py-4 w-48">Layanan & Tujuan</th>
                <th class="px-4 py-4 w-32">Nominal</th>
                <th class="px-4 py-4 w-28 text-center">Status</th>
                <th class="px-4 py-4">Keterangan / Server Log</th>
                {/* 🟢 TAMBAHAN: Kolom Aksi untuk Struk */}
                <th class="px-4 py-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/50">
              {transactions && transactions.length > 0 ? transactions.map((trx: any) => {
                
                const dateObj = new Date(trx.created_at);
                const dateStr = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                // ==========================================
                // 🧹 LOGIC FILTERING: MEMBUANG INFO SALDO
                // ==========================================
                let cleanLog = trx.server_log || '-';
                
                if (cleanLog !== '-') {
                  // Regex ini akan mendeteksi kata "Saldo" beserta semua angka/teks di belakangnya 
                  // dan membuangnya. Jika sebelumnya ada titik banyak (..), akan dirapikan jadi satu titik.
                  cleanLog = cleanLog.replace(/[\.\s,]*Saldo\s.*$/i, '.').trim();
                }

                return (
                  <tr class="hover:bg-slate-800/10 transition-colors">
                    <td class="px-4 py-4 whitespace-nowrap">
                      <span class="block text-slate-200 font-medium">{dateStr}</span>
                      <span class="text-[11px] text-slate-500">{timeStr}</span>
                    </td>
                    <td class="px-4 py-4">
                      <span class="block text-sm font-bold text-slate-200">{trx.product_name}</span>
                      <span class="text-xs text-slate-400 font-mono mt-0.5 block">{trx.customer_number}</span>
                    </td>
                    <td class="px-4 py-4 whitespace-nowrap font-medium text-slate-300">
                      Rp {trx.total_price.toLocaleString('id-ID')}
                    </td>
                    <td class="px-4 py-4 text-center whitespace-nowrap">
                      <span class={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        trx.status === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        trx.status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                        trx.status === 'waiting_payment' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {trx.status}
                      </span>
                    </td>
                    <td class="px-4 py-4 text-xs text-slate-400">
                      <div class="bg-[#121217] p-2 rounded border border-slate-800/60 font-mono text-[11px] whitespace-pre-wrap break-words max-w-md">
                        {/* TAMPILKAN LOG YANG SUDAH DIBERSIHKAN */}
                        {cleanLog}
                      </div>

                      {trx.status === 'waiting_payment' && (
                        <form method="POST" action="/api/user/v1/order/pay" class="mt-2">
                           <input type="hidden" name="trx_id" value={trx.id} />
                           <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 rounded transition-colors text-xs">
                             Bayar Tagihan Sekarang
                           </button>
                        </form>
                      )}
                    </td>

                    {/* 🟢 TAMBAHAN: Tombol untuk membuka halaman struk */}
                    <td class="px-4 py-4 text-center whitespace-nowrap">
                      <a href={`/user/receipt/${trx.id}`} class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-600/20 hover:border-blue-600 text-[11px] font-bold rounded-lg transition-all">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        Struk
                      </a>
                    </td>

                  </tr>
                )
              }) : (
                <tr>
                  {/* 🟢 PERBAIKAN: colSpan diubah jadi 6 karena kita menambah 1 kolom baru */}
                  <td colSpan={6} class="px-4 py-12 text-center text-slate-500 text-sm">
                    Belum ada riwayat transaksi.
                  </td>
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
