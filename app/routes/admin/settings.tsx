import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Ambil konfigurasi saat ini dari Cloudflare KV
  const siteConfig = await c.env.SITE_KV.get('site_settings', 'json') || {
    siteName: '',
    siteDescription: '',
    themeColor: '#000000'
  } as any

  return c.render(
    <div class="admin-settings">
      <h1>Pengaturan Website</h1>
      <p>Perubahan di sini akan langsung memperbarui Cloudflare KV Cache.</p>
      
      {/* Form diarahkan ke Endpoint API Admin */}
      <form method="POST" action="/api/admin/v1/settings/update">
        <div class="form-group">
          <label>Nama Website</label>
          <input type="text" name="siteName" value={siteConfig.siteName} required />
        </div>
        <div class="form-group">
          <label>Deskripsi (SEO)</label>
          <textarea name="siteDescription" required>{siteConfig.siteDescription}</textarea>
        </div>
        <div class="form-group">
          <label>Warna Tema Utama</label>
          <input type="color" name="themeColor" value={siteConfig.themeColor} />
        </div>
        <button type="submit" class="btn btn-primary">Simpan ke KV Cache</button>
      </form>
    </div>,
    { title: 'Pengaturan Admin' }
  )
})
