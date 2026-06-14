import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  // Cegah user yang sudah login mengakses halaman pendaftaran
  const user = c.get('user')
  if (user) {
    return c.redirect('/user/dashboard')
  }

  // Tangkap kode referral dari URL (contoh: domain.com/register?ref=KODE123)
  const referralCode = c.req.query('ref') || ''

  return c.render(
    <div class="register-container">
      <h2>Daftar Akun Baru</h2>
      <p>Bergabunglah dan mulai gunakan sistem multi-supplier kami.</p>
      
      {/* Aksi form diarahkan ke endpoint public API */}
      <form method="POST" action="/api/public/v1/auth/register">
        <div class="form-group">
          <label for="name">Nama Lengkap</label>
          <input type="text" id="name" name="name" required />
        </div>
        
        <div class="form-group">
          <label for="email">Alamat Email</label>
          <input type="email" id="email" name="email" required />
        </div>
        
        <div class="form-group">
          <label for="password">Kata Sandi</label>
          <input type="password" id="password" name="password" required />
        </div>

        <div class="form-group">
          <label for="referral_code">Kode Referral (Opsional)</label>
          <input 
            type="text" 
            id="referral_code" 
            name="referral_code" 
            value={referralCode} 
            placeholder="Masukkan kode jika ada" 
          />
        </div>
        
        <button type="submit" class="btn btn-primary">Daftar Sekarang</button>
      </form>
      
      <p class="auth-link">Sudah punya akun? <a href="/login">Login di sini</a>.</p>
    </div>,
    { title: 'Pendaftaran Member' }
  )
})
