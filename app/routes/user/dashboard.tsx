import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  return c.render(
    <div class="max-w-6xl mx-auto space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 class="text-2xl font-bold text-slate-100">Dashboard</h1>
          <p class="text-sm text-slate-400">Ringkasan aktivitas dan metrik akun Anda.</p>
        </div>
        <div class="flex items-center gap-3 bg-[#18181b] border border-slate-800/60 p-2 pr-4 rounded-full">
          <div class="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span class="text-sm font-medium text-slate-200">{user.name}</span>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Saldo Utama */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0021 5.25V12zM3 12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 12v-1.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v1.5z" /></svg>
              </div>
              <h3 class="text-sm font-medium text-slate-400">Saldo Tersedia</h3>
            </div>
          </div>
          <h2 class="text-3xl font-bold text-slate-100 tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
          <p class="text-xs text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg> Siap digunakan
          </p>
        </div>

        {/* Card 2: Saldo Tertunda */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-amber-500/10 rounded-xl text-amber-400">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 class="text-sm font-medium text-slate-400">Saldo Tertunda</h3>
            </div>
          </div>
          <h2 class="text-3xl font-bold text-slate-100 tracking-tight">Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
          <p class="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1">Menunggu validasi afiliasi</p>
        </div>

        {/* Card 3: Status Akun */}
        <div class="bg-gradient-to-br from-emerald-600 to-emerald-900 border border-emerald-700/50 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20">
          <h3 class="text-sm font-medium text-emerald-200/80 mb-4">Tipe Keanggotaan</h3>
          <h2 class="text-2xl font-bold capitalize mb-1">{user.role} Member</h2>
          <p class="text-xs text-emerald-200/60 mb-4">Akses sistem {user.role === 'admin' ? 'penuh' : 'reguler'}</p>
          <a href="/user/settings" class="inline-flex items-center justify-center w-full py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-sm font-medium transition-colors">
            Kelola Akun
          </a>
        </div>

      </div>
    </div>,
    { title: 'Dashboard Member' }
  )
})
