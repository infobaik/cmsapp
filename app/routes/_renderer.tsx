import { jsxRenderer } from 'hono/jsx-renderer'
import { Script, Link } from 'honox/server'

export default jsxRenderer(({ children, title }, c) => {
  const user = c.get('user')

  return (
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} | Sistem Pintar` : 'Topup PPOB Tercepat'}</title>
        
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        
        {/* INI WAJIB ADA AGAR TAILWIND TAMPIL DI PRODUCTION */}
        <Link href="/app/style.css" rel="stylesheet" /> 
        <Script src="/app/client.ts" async />
      </head>
      <body class="font-sans antialiased text-slate-100 bg-slate-950">
        <header class="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
          <nav class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div class="text-xl font-black text-blue-500 italic tracking-tighter">
              <a href="/">LOGO.</a>
            </div>
            
            <ul class="flex items-center gap-6 text-sm font-semibold text-slate-300">
              {!user ? (
                <>
                  <li><a href="/" class="hover:text-white transition">Beranda</a></li>
                  <li><a href="/login" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-full transition">Masuk / Daftar</a></li>
                </>
              ) : (
                <>
                  <li class="hidden md:block">Halo, <span class="text-white">{user.name}</span></li>
                  <li><a href="/user/dashboard" class="hover:text-white transition">Dashboard</a></li>
                  {user.role === 'admin' && (
                    <li><a href="/admin" class="text-amber-400 hover:text-amber-300 transition">Panel Admin</a></li>
                  )}
                  <li><a href="/api/user/v1/logout" class="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-full transition">Keluar</a></li>
                </>
              )}
            </ul>
          </nav>
        </header>
        
        <main>
          {children}
        </main>
        
        <footer class="bg-slate-900 border-t border-slate-800 mt-12 py-8 text-center text-slate-500 text-sm">
          <p>&copy; 2026 Hak Cipta Dilindungi. Sistem Multi-Supplier Pintar.</p>
        </footer>
      </body>
    </html>
  )
})
