import { createRoute } from 'honox/factory'
// Import fungsi internal.
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  
  // Panggil data langsung dari D1 (Database)
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  // Tangkap pesan sukses/error dari URL
  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-5xl mx-auto space-y-6">
      
      {/* HEADER DOMPET */}
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Dompet Digital</h1>
        <p class="text-sm text-slate-400">Kelola saldo, pendapatan, dan pencairan dana Anda.</p>
      </div>

      {/* NOTIFIKASI */}
      {successMsg === 'penarikan_diproses' && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Permintaan penarikan saldo Anda sedang diproses.
        </div>
      )}
      {errorMsg === 'saldo_tidak_cukup' && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Gagal: Saldo Anda tidak mencukupi untuk penarikan ini.
        </div>
      )}

      {/* KARTU SALDO (GRID) */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* CARD: Saldo Tersedia */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 shrink-0">
              <svg width="24" height="24" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0021 5.25V12zM3 12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 12v-1.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v1.5z" /></svg>
            </div>
            <h3 class="text-sm font-semibold text-slate-300">Saldo Tersedia</h3>
          </div>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium">
             <span class="text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded flex items-center gap-1">
               <svg width="12" height="12" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" /></svg> Aktif
             </span>
             <span class="text-slate-500">Dapat digunakan untuk transaksi.</span>
          </div>
        </div>
        
        {/* CARD: Saldo Tertunda */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 relative overflow-hidden group">
          <div class="flex items-center gap-3 mb-6">
            <div class="p-2.5 bg-amber-500/10 rounded-xl text-amber-400 shrink-0">
              <svg width="24" height="24" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <h3 class="text-sm font-semibold text-slate-300">Saldo Tertunda</h3>
          </div>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
          <div class="mt-4 flex items-center gap-2 text-xs font-medium">
             <span class="text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded flex items-center gap-1">
               <svg width="12" height="12" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Pending
             </span>
             <span class="text-slate-500">Menunggu validasi (afiliasi/bonus).</span>
          </div>
        </div>
      </div>
      
      {/* FORM AKSI PENARIKAN */}
      <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
        <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3 flex items-center gap-2">
          <svg width="20" height="20" class="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
          Tarik Saldo Ke Rekening
        </h2>
        
        <p class="text-xs text-slate-400 mb-6 leading-relaxed max-w-2xl">
          Pencairan dana hanya dapat dilakukan dari <strong>Saldo Tersedia</strong>. Permintaan penarikan akan diproses ke rekening bank utama yang terdaftar pada akun Anda selambat-lambatnya 1x24 jam kerja.
        </p>

        <form method="POST" action="/api/user/v1/wallet/withdraw" class="max-w-xs">
          <button 
            type="submit" 
            class="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl transition-colors border border-transparent" 
            disabled={wallet.balance_available <= 0}
          >
            {wallet.balance_available <= 0 ? 'Saldo Tidak Mencukupi' : 'Ajukan Pencairan Dana'}
          </button>
        </form>
      </div>

    </div>,
    { title: 'My Wallet' }
  )
})
