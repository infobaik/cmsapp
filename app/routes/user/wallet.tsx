import { createRoute } from 'honox/factory'
// Import fungsi internal. File service ini akan kita buat pada bagian selanjutnya.
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  
  // Panggil data langsung dari D1 (Database)
  // Berikan nilai default jika user baru dan belum memiliki record wallet
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  return c.render(
    <div class="wallet-container">
      <h1>Dompet Digital Anda</h1>
      
      <div class="balance-cards">
        <div class="card available">
          <h3>Saldo Tersedia</h3>
          <h2>Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
          <p>Dapat digunakan untuk transaksi.</p>
        </div>
        
        <div class="card pending">
          <h3>Saldo Tertunda</h3>
          <h2>Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
          <p>Menunggu validasi sistem (affiliasi/bonus).</p>
        </div>
      </div>
      
      <div class="wallet-actions">
        <h3>Tarik Saldo</h3>
        <form method="POST" action="/api/user/v1/wallet/withdraw">
          <button type="submit" class="btn btn-withdraw" disabled={wallet.balance_available <= 0}>
            Cairkan Saldo
          </button>
        </form>
      </div>
    </div>,
    { title: 'Dompet' }
  )
})
