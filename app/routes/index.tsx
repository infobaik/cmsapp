import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  return c.render(
    <div class="hero-section">
      <h1>Selamat Datang di Platform Canggih Kami</h1>
      <p>Sistem multi-supplier tercepat dengan teknologi Cloudflare Serverless.</p>
      <div class="action-buttons">
        <a href="/login" class="btn btn-primary">Masuk ke Akun</a>
        <a href="/register" class="btn btn-outline">Daftar Sekarang</a>
      </div>
    </div>,
    { title: 'Beranda' }
  )
})
