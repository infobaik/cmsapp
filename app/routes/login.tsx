import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  // Cegah user yang sudah login mengakses halaman login
  const user = c.get('user')
  if (user) {
    return c.redirect('/user/dashboard')
  }

  return c.render(
    <div class="login-container">
      <h2>Masuk ke Sistem</h2>
      {/* Aksi diarahkan ke endpoint public API khusus autentikasi */}
      <form method="POST" action="/api/public/v1/auth/login">
        <div class="form-group">
          <label for="email">Alamat Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        <div class="form-group">
          <label for="password">Kata Sandi</label>
          <input type="password" id="password" name="password" required />
        </div>
        <button type="submit" class="btn btn-primary">Login</button>
      </form>
    </div>,
    { title: 'Login' }
  )
})
