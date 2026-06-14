import { jsxRenderer } from 'hono/jsx-renderer'
import { Script } from 'honox/server'

export default jsxRenderer(({ children, title }, c) => {
  const user = c.get('user')

  return (
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} | Sistem Pintar` : 'Aplikasi Serverless'}</title>
        {/* CSS akan kita injeksi dinamis dari KV nanti */}
        <link rel="stylesheet" href="/static/style.css" /> 
        <Script src="/app/client.ts" async />
      </head>
      <body>
        <header>
          <nav>
            <div class="logo">App Logo</div>
            <ul class="nav-links">
              {/* Logika Cerdas Berdasarkan Context User */}
              {!user ? (
                <>
                  <li><a href="/">Beranda</a></li>
                  <li><a href="/login">Login</a></li>
                </>
              ) : (
                <>
                  <li>Halo, <strong>{user.name}</strong></li>
                  <li><a href="/user/dashboard">Dashboard Member</a></li>
                  {user.role === 'admin' && (
                    <li><a href="/admin">Panel Admin</a></li>
                  )}
                  <li><a href="/api/user/v1/logout">Logout</a></li>
                </>
              )}
            </ul>
          </nav>
        </header>
        
        <main class="container">
          {children}
        </main>
        
        <footer>
          <p>&copy; 2026 Hak Cipta Dilindungi.</p>
        </footer>
      </body>
    </html>
  )
})
