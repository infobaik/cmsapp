import { createRoute } from 'honox/factory'

export default createRoute(async (c, next) => {
  const user = c.get('user')
  
  // 1. Jika belum login, tendang ke halaman login
  if (!user) {
    return c.redirect('/login')
  }

  // 2. Jika sudah login TAPI BUKAN admin, tendang ke dashboard member biasa
  if (user.role !== 'admin') {
    return c.redirect('/user/dashboard')
  }
  
  // Lolos pemeriksaan, izinkan akses ke halaman admin
  await next()
})
