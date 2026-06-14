import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  const user = c.get('user')!

  return c.render(
    <div class="admin-dashboard">
      <h1>Pusat Kendali Admin</h1>
      <p>Selamat bertugas, <strong>{user.name}</strong>.</p>
      
      <div class="admin-grid">
        <a href="/admin/members" class="admin-card">Manajemen Member</a>
        <a href="/admin/products" class="admin-card">Katalog & Produk</a>
        <a href="/admin/categories" class="admin-card">Kategori Sistem</a>
        <a href="/admin/blog" class="admin-card">Manajemen Blog</a>
        <a href="/admin/settings" class="admin-card">Pengaturan Sistem</a>
      </div>
    </div>,
    { title: 'Admin Panel' }
  )
})
