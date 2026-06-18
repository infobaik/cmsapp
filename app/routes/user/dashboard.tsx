import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // PERBAIKAN: Menghapus filter 'type = 'product'' agar tidak menyebabkan Internal Server Error
  const { results: categories } = await c.env.DB.prepare(
    `SELECT id, name, slug, image_url FROM categories WHERE parent_id IS NULL ORDER BY name ASC`
  ).all()

  return c.render(
    <div class="max-w-7xl mx-auto space-y-8">
      
      {/* KARTU STATISTIK BANKCO STYLE */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Saldo Tersedia */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <svg width="24" height="24" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0021 5.25V12zM3 12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 12v-1.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v1.5z" /></svg>
            </div>
            <h3 class="text-sm font-semibold text-slate-300">Total Saldo</h3>
          </div>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium">
             <span class="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">
               <svg width="12" height="12" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg> Aktif
             </span>
             <span class="text-slate-500">Siap digunakan transaksi</span>
          </div>
        </div>

        {/* Card 2: Saldo Tertunda */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
              <svg width="24" height="24" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 class="text-sm font-semibold text-slate-300">Dana Tertunda</h3>
          </div>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium">
             <span class="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
               <svg width="12" height="12" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Pending
             </span>
             <span class="text-slate-500">Menunggu validasi sistem</span>
          </div>
        </div>

        {/* Card 3: Pintasan Cepat */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden">
           <h3 class="text-sm font-semibold text-slate-300 mb-6">Pintasan Cepat</h3>
           <div class="space-y-3">
             <a href="/user/wallet" class="flex items-center justify-between p-3 rounded-xl bg-[#121217] hover:bg-emerald-500/10 border border-slate-800/60 hover:border-emerald-500/30 transition-colors group">
               <span class="text-sm font-medium text-slate-300 group-hover:text-emerald-400">Topup Saldo (Deposit)</span>
               <svg width="16" height="16" class="text-slate-500 group-hover:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
             </a>
             <a href="/user/history" class="flex items-center justify-between p-3 rounded-xl bg-[#121217] hover:bg-blue-500/10 border border-slate-800/60 hover:border-blue-500/30 transition-colors group">
               <span class="text-sm font-medium text-slate-300 group-hover:text-blue-400">Riwayat Transaksi</span>
               <svg width="16" height="16" class="text-slate-500 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
             </a>
           </div>
        </div>
      </div>

      {/* THUMBNAIL KATEGORI PRODUK INDUK */}
      <div>
        <h2 class="text-lg font-bold text-slate-100 mb-4 border-b border-slate-800/60 pb-2">Katalog Layanan</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
          {categories.map((cat: any) => (
            <a href={`/user/kategori/${cat.id}`} class="flex flex-col items-center justify-center p-4 bg-[#18181b] border border-slate-800/60 hover:border-emerald-500/50 rounded-2xl transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/10 group">
              <div class="w-12 h-12 rounded-full bg-[#121217] flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 text-slate-400 group-hover:text-emerald-400 transition-colors overflow-hidden">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} class="w-full h-full object-cover" loading="lazy" />
                ) : (
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" /></svg>
                )}
              </div>
              <span class="text-xs font-semibold text-slate-300 text-center">{cat.name}</span>
            </a>
          ))}
        </div>
      </div>

    </div>,
    { title: 'Dashboard' }
  )
})
