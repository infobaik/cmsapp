import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const user = c.get('user')!
  
  // Mengambil data orang yang diundang dari D1
  const query = `SELECT name, created_at FROM users WHERE referred_by_id = ?`
  const { results: referrals } = await c.env.DB.prepare(query).bind(user.id).all()

  return c.render(
    <div class="referral-container">
      <h1>Sistem Afiliasi</h1>
      <div class="referral-link-box">
        <p>Bagikan tautan ini untuk mendapatkan komisi:</p>
        <input 
          type="text" 
          readonly 
          value={`https://domainanda.com/register?ref=${user.referral_code}`} 
          class="form-control"
        />
      </div>

      <div class="referral-list">
        <h3>Anggota yang Anda Undang: {referrals.length} Orang</h3>
        {referrals.length > 0 ? (
          <ul>
            {referrals.map((ref: any) => (
              <li>{ref.name} - Bergabung pada {new Date(ref.created_at).toLocaleDateString('id-ID')}</li>
            ))}
          </ul>
        ) : (
          <p>Belum ada yang mendaftar menggunakan kode Anda.</p>
        )}
      </div>
    </div>,
    { title: 'Afiliasi Saya' }
  )
})
