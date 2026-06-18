import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  const user = c.get('user')
  if (user) {
    return c.redirect('/user/dashboard')
  }

  const errorMsg = c.req.query('error')

  return c.render(
    <div class="w-full max-w-md mx-auto mt-12 md:mt-24 p-6 relative z-10">
      
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-emerald-500/20 mx-auto mb-6">
          +
        </div>
        <h1 class="text-3xl font-bold text-slate-100 tracking-tight">Buat Akun Baru</h1>
        <p class="text-sm text-slate-400 mt-2">Bergabunglah dengan ribuan agen PPOB lainnya.</p>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6 flex items-center gap-3">
          <svg width="20" height="20" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>{errorMsg === 'email_exists' ? 'Email ini sudah terdaftar. Silakan gunakan email lain.' : 'Terjadi kesalahan saat mendaftar.'}</span>
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Aksen Latar Belakang */}
        <div class="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
        
        <form method="POST" action="/api/public/v1/auth/register" class="space-y-6 relative z-10">
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wide">Nama Lengkap</label>
            <input type="text" name="name" required placeholder="Contoh: John Doe" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-4 text-slate-200 outline-none transition-all placeholder-slate-600" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wide">Alamat Email</label>
            <input type="email" name="email" required placeholder="nama@email.com" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-4 text-slate-200 outline-none transition-all placeholder-slate-600" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wide">Kata Sandi (Minimal 6 Karakter)</label>
            <input type="password" name="password" minlength="6" required placeholder="••••••••" class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl p-4 text-slate-200 outline-none transition-all placeholder-slate-600" />
          </div>
          
          <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-500/20 mt-2">
            Mendaftar & Mulai
          </button>
        </form>
      </div>

      <p class="text-center text-sm text-slate-500 mt-8">
        Sudah memiliki akun? <a href="/login" class="text-emerald-400 hover:text-emerald-300 font-bold transition-colors">Masuk di sini</a>
      </p>

    </div>,
    { title: 'Pendaftaran Akun' }
  )
})
