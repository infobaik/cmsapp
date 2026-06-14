import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const userContext = c.get('user')!
  const user = await c.env.DB.prepare(`SELECT name, email, api_key, referral_code FROM users WHERE id = ?`).bind(userContext.id).first()
  
  if (!user) return c.redirect('/login')

  const successMsg = c.req.query('success')
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="max-w-5xl mx-auto space-y-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Pengaturan Akun</h1>
        <p class="text-sm text-slate-400">Kelola keamanan dan integrasi sistem Anda.</p>
      </div>

      {successMsg === 'password_updated' && (
        <div class="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Kata sandi Anda berhasil diperbarui.
        </div>
      )}
      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium flex items-center gap-2">
          <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {errorMsg === 'wrong_password' ? 'Kata sandi lama yang dimasukkan salah.' : 'Konfirmasi sandi baru tidak cocok.'}
        </div>
      )}

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kiri: Info & API */}
        <div class="space-y-6">
          <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl">
            <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Profil Pengguna</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nama Lengkap</label>
                <input type="text" readonly value={user.name as string} class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-3 text-slate-300 outline-none" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1.5">Alamat Email</label>
                <input type="text" readonly value={user.email as string} class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-3 text-slate-300 outline-none" />
              </div>
            </div>
          </div>

          <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl">
            <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Integrasi API (B2B/Bot)</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1.5">Secret API Key</label>
                <input type="text" readonly value={user.api_key as string} class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-3 text-emerald-400 font-mono text-sm outline-none cursor-text focus:border-emerald-500/50 transition-colors" onClick="this.select();" />
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kode Referral Afiliasi</label>
                <input type="text" readonly value={user.referral_code as string} class="w-full bg-[#121217] border border-slate-800/60 rounded-xl p-3 text-blue-400 font-bold tracking-wider outline-none cursor-text focus:border-blue-500/50 transition-colors" onClick="this.select();" />
              </div>
            </div>
          </div>
        </div>

        {/* Kanan: Keamanan */}
        <div class="bg-[#18181b] border border-slate-800/60 p-6 rounded-2xl h-fit">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Keamanan</h2>
          <form method="POST" action="/api/user/v1/settings/password" class="space-y-5">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kata Sandi Saat Ini</label>
              <input type="password" name="old_password" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none transition-all" />
            </div>
            
            <div class="pt-2">
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Kata Sandi Baru</label>
              <input type="password" name="new_password" required minlength="6" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none transition-all" />
            </div>
            
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Ulangi Kata Sandi Baru</label>
              <input type="password" name="confirm_password" required minlength="6" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none transition-all" />
            </div>

            <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-colors mt-4">
              Simpan Perubahan
            </button>
          </form>
        </div>
      </div>
    </div>,
    { title: 'Pengaturan Akun' }
  )
})
