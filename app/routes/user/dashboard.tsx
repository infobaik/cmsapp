import { createRoute } from 'honox/factory'

export default createRoute((c) => {
  // Data user dipastikan aman karena sudah melewati _middleware user
  const user = c.get('user')!

  return c.render(
    <div class="dashboard-container">
      <h1>Dashboard Member</h1>
      <p>Selamat datang kembali, <strong>{user.name}</strong>!</p>
      
      <div class="quick-stats">
        <div class="stat-card">
          <h3>Tipe Keanggotaan</h3>
          <p>{user.role === 'admin' ? 'Administrator' : 'Member Reguler'}</p>
        </div>
        <div class="stat-card">
          <h3>Pengaturan API</h3>
          <p>Kelola integrasi bot WA/TG Anda.</p>
          <a href="/user/settings" class="btn btn-small">Lihat Kredensial</a>
        </div>
      </div>
    </div>,
    { title: 'Dashboard' }
  )
})
