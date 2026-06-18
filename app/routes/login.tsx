import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  const user = c.get('user')
  if (user) {
    return c.redirect('/user/dashboard')
  }

  // Tangkap parameter jika login gagal
  const errorMsg = c.req.query('error')

  return c.render(
    <div class="w-full max-w-md mx-auto mt-12 md:mt-24 p-6 relative z-10">
      
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-blue-500/20 mx-auto mb-6">
          S
        </div>
        <h1 class="text-3xl font-bold text-slate-100 tracking-tight">Selamat Datang</h1>
        <p class="text-sm text-slate-400 mt-2">Masuk untuk mengelola transaksi dan saldo Anda.</p>
      </div>

      {errorMsg && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-medium mb-6 flex items-center gap-3">
          <svg width="20" height="20" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <span>{errorMsg === 'invalid_credentials' ? 'Email atau kata sandi salah.' : 'Terjadi kesalahan sistem.'}</span>
        </div>
      )}

      <div class="bg-[#18181b] border border-slate-800/60 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Aksen Latar Belakang */}
        <div class="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl"></div>
        
        <form method="POST" action="/api/public/v1/auth/login" class="space-y-6 relative z-10">
          <div>
            <label class="block text-xs font-bold text-slate-400 mb-2.5 uppercase tracking-wide">Alamat Email</label>
            <input type="email" name="email" required placeholder="nama@email.com" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-xl p-4 text-slate-200 outline-none transition-all placeholder-slate-600" />
          </div>
          <div>
            <div class="flex items-center justify-between mb-2.5">
              <label class="block text-xs font-bold text-slate-400 uppercase tracking-wide">Kata Sandi</label>
              <a href="#" class="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors">Lupa sandi?</a>
            </div>
            <input type="password" name="password" required placeholder="••••••••" class="w-full bg-[#121217] border border-slate-800/60 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 rounded-xl p-4 text-slate-200 outline-none transition-all placeholder-slate-600" />
          </div>
          
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all hover:-translate-y-0.5 shadow-lg shadow-blue-500/20 mt-2">
            Masuk ke Sistem
          </button>
        </form>
      </div>

      <p class="text-center text-sm text-slate-500 mt-8">
        Belum memiliki akun? <a href="/register" class="text-blue-400 hover:text-blue-300 font-bold transition-colors">Daftar sekarang</a>
      </p>

    </div>,
    { title: 'Login Akses' }
  )
})
