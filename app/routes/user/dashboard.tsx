import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      {/* KARTU STATISTIK BANKCO STYLE */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Saldo Tersedia */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group">
          <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
                <svg width="24" height="24" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0021 5.25V12zM3 12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 12v-1.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v1.5z" /></svg>
              </div>
              <h3 class="text-sm font-semibold text-slate-300">Total Saldo</h3>
            </div>
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
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group">
          <div class="flex justify-between items-start mb-6">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
                <svg width="24" height="24" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 class="text-sm font-semibold text-slate-300">Dana Tertunda</h3>
            </div>
          </div>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium">
             <span class="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
               <svg width="12" height="12" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Pending
             </span>
             <span class="text-slate-500">Menunggu validasi sistem</span>
          </div>
        </div>

        {/* Card 3: Status Member (Redesign) */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden">
           {/* Hiasan Latar Belakang */}
           <div class="absolute -right-6 -top-6 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl"></div>
           
           <h3 class="text-sm font-semibold text-slate-300 mb-6">Informasi Akun</h3>
           <div class="space-y-4">
             <div class="flex justify-between items-center border-b border-slate-800/60 pb-3">
               <span class="text-sm text-slate-500">Tipe Member</span>
               <span class="text-sm font-bold text-white capitalize">{user.role}</span>
             </div>
             <div class="flex justify-between items-center border-b border-slate-800/60 pb-3">
               <span class="text-sm text-slate-500">Status Keamanan</span>
               <span class="text-sm font-bold text-emerald-400 flex items-center gap-1">
                 <svg width="14" height="14" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Terverifikasi
               </span>
             </div>
           </div>
        </div>

      </div>
    </div>,
    { title: 'Dashboards' }
  )
})
