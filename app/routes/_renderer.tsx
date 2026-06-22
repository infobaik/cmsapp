import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(({ children, title }, c) => {
  const user = c.get('user')

  return (
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} | SistemCo.` : 'Topup PPOB Tercepat'}</title>
        
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>
      
      <body class="font-sans antialiased bg-[#121217] text-slate-100 min-h-screen flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
        
        {/* HEADER ELEGAN */}
        <header class="bg-[#18181b]/80 backdrop-blur-md border-b border-slate-800/60 sticky top-0 z-50">
          <nav class="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">S</div>
              <a href="/" class="text-xl font-bold tracking-tight text-white hover:text-blue-400 transition-colors">SistemCo.</a>
            </div>
            
            <ul class="flex items-center gap-4 text-sm font-semibold text-slate-300">
              {!user ? (
                <>
                  <li class="hidden sm:block"><a href="/" class="hover:text-white transition-colors px-3 py-2">Beranda</a></li>
                  <li class="hidden sm:block"><a href="/register" class="hover:text-white transition-colors px-3 py-2">Daftar</a></li>
                  <li>
                    <a href="/login" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 border border-blue-500/50">
                      Masuk Area
                    </a>
                  </li>
                </>
              ) : (
                <>
                  <li class="hidden md:block text-slate-400">Hi, <span class="text-white">{user.name}</span></li>
                  <li>
                    <a href="/user/dashboard" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 border border-emerald-500/50">
                      Dashboard
                    </a>
                  </li>
                  {user.role === 'admin' && (
                    <li>
                      <a href="/admin" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-blue-500/20 border border-blue-500/50 hidden sm:block">
                        Admin
                      </a>
                    </li>
                  )}
                </>
              )}
            </ul>
          </nav>
        </header>
        
        {/* AREA KONTEN FLEKSIBEL (Di sinilah halaman Kategori akan dirender) */}
        <main class="flex-1 flex flex-col relative">
          {children}
        </main>
        
        {/* FOOTER MODERN */}
        <footer class="bg-[#0a0a0c] border-t border-slate-800/60 mt-auto py-10 relative z-10">
          <div class="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="flex items-center gap-2">
               <div class="w-6 h-6 bg-slate-800 rounded flex items-center justify-center font-bold text-slate-400 text-xs">S</div>
               <span class="text-sm font-bold text-slate-200">SistemCo.</span>
            </div>
            <p class="text-slate-500 text-xs font-medium">&copy; 2026 Hak Cipta Dilindungi. Sistem Multi-Supplier Pintar.</p>
          </div>
        </footer>

      </body>
    </html>
  )
})
