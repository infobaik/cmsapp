import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }
  
  // Ambil daftar payment gateway aktif untuk opsi deposit
  const { results: gateways } = await c.env.DB.prepare(`SELECT code, name FROM payment_gateways WHERE status = 'active'`).all()

  const successMsg = c.req.query('success')

  return c.render(
    <div class="max-w-6xl mx-auto space-y-6">
      
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Dompet Digital</h1>
        <p class="text-sm text-slate-400">Kelola saldo, deposit, dan pencairan dana Anda.</p>
      </div>

      {successMsg === 'deposit_created' && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Tiket Deposit berhasil dibuat. Silakan lakukan pembayaran.
        </div>
      )}

      {/* KARTU SALDO (GRID) */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-400 mb-2">Saldo Tersedia</h3>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
        </div>
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-400 mb-2">Saldo Tertunda</h3>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
        </div>
      </div>
      
      {/* FORM DEPOSIT & PENARIKAN (SIDE BY SIDE) */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* KOLOM DEPOSIT */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Topup Saldo (Deposit)</h2>
          <form method="POST" action="/api/user/v1/wallet/deposit" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nominal Topup (Rp)</label>
              <input type="number" name="amount" min="1000" placeholder="Min. 10000" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Metode Pembayaran</label>
              <select name="gateway_code" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none">
                {gateways.map((gw: any) => (
                  <option value={gw.code}>{gw.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-colors mt-2">
              Buat Tiket Deposit
            </button>
          </form>
        </div>

        {/* KOLOM PENARIKAN */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Tarik Dana</h2>
          <p class="text-xs text-slate-400 mb-6 leading-relaxed">
            Pencairan dana akan diproses ke rekening yang terdaftar. Saldo minimal penarikan adalah Rp 50.000.
          </p>
          <form method="POST" action="/api/user/v1/wallet/withdraw">
            <button type="submit" class="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-50" disabled={wallet.balance_available < 50000}>
              Ajukan Penarikan (Rp 50.000)
            </button>
          </form>
        </div>

      </div>
    </div>,
    { title: 'My Wallet' }
  )
})
