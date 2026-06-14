import { createRoute } from 'honox/factory'

export default createRoute(async (c, next) => {
  // Mengambil user context yang sudah diset oleh _middleware global di luar
  const user = c.get('user')
  
  // Validasi Absolut: Jika tidak ada data user, tolak akses dan arahkan ke login
  if (!user) {
    return c.redirect('/login')
  }
  
  await next()
})
