import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { id: null, balance_available: 0, balance_pending: 0 }
  
  const { results: gateways } = await c.env.DB.prepare(`SELECT code, name FROM payment_gateways WHERE status = 'active'`).all()
  
  // 🔥 PERBAIKAN: Mengambil 10 Riwayat Saldo Terakhir dari Database
  let transactions: any = [];
  if (wallet.id) {
    const { results } = await c.env.DB.prepare(`
      SELECT amount, type, description, created_at 
      FROM wallet_transactions 
      WHERE wallet_id = ? 
      ORDER BY created_at DESC 
      LIMIT 10
    `).bind(wallet.id).all();
    transactions = results;
  }

  return c.render(
    <div class="max-w-6xl mx-auto space-y-6">
      
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-slate-100">Dompet Digital</h1>
        <p class="text-sm text-slate-400">Kelola saldo dan riwayat deposit Anda.</p>
      </div>

      {/* KARTU SALDO (GRID) */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-400 mb-2">Saldo Tersedia</h3>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
        </div>
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h3 class="text-sm font-semibold text-slate-400 mb-2">Saldo Tertunda</h3>
          <h2 class="text-3xl font-bold text-white tracking-tight">Rp {wallet.balance_pending.toLocaleString('id-ID')}</h2>
        </div>
      </div>
      
      {/* FORM DEPOSIT & RIWAYAT SALDO (SIDE BY SIDE) */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* KOLOM DEPOSIT */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Topup Saldo (Deposit)</h2>
          
          <form id="depositForm" method="POST" action="/api/user/v1/wallet/deposit" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Nominal Topup (Rp)</label>
              <input type="number" id="depositAmount" name="amount" min="10000" placeholder="Min. 10000" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-500 mb-1.5">Metode Pembayaran</label>
              <select id="depositGateway" name="gateway_code" required class="w-full bg-[#121217] border border-slate-800/60 focus:border-emerald-500/50 rounded-xl p-3 text-slate-200 outline-none">
                {gateways.map((gw: any) => (
                  <option value={gw.code}>{gw.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" id="btnSubmit" class="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-colors mt-2">
              Buat Tiket Deposit
            </button>
          </form>

          {/* AREA QRIS AJAX */}
          <div id="qrisArea" class="hidden mt-4 flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 rounded-2xl bg-[#121217]">
            <h4 class="font-bold text-slate-200 text-lg mb-1">Scan QRIS untuk Membayar</h4>
            <p class="text-slate-400 text-sm mb-5">
              Sisa Waktu: <span id="countdownTimer" class="font-bold text-red-500 text-lg ml-1">15:00</span>
            </p>
            <div class="bg-white p-4 rounded-3xl shadow-sm mb-5 relative">
               <img id="qrisImage" src="" alt="QR Code" class="w-56 h-56 md:w-64 md:h-64 object-contain" />
            </div>
            <div class="text-center space-y-1 mb-6">
               <p class="text-sm font-medium text-slate-400">ID Tiket: <span id="lblDepositId" class="font-bold text-slate-200 font-mono"></span></p>
               <p class="text-sm font-medium text-slate-400">Total Transfer: <span id="lblAmount" class="font-bold text-emerald-400 text-xl block mt-1"></span></p>
            </div>
            <div id="paymentStatusBox" class="w-full max-w-sm px-4 py-3 bg-amber-500/10 text-amber-500 text-center rounded-xl text-sm font-semibold animate-pulse border border-amber-500/20">
              <span class="inline-block animate-spin mr-2">⏳</span> Menunggu Pembayaran Anda...
            </div>
          </div>
        </div>

        {/* 🔥 KOLOM BARU: BUKU BESAR / RIWAYAT TRANSAKSI SALDO */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6">
          <h2 class="text-sm font-bold text-slate-200 uppercase tracking-wide mb-4 border-b border-slate-800/60 pb-3">Riwayat Transaksi Saldo</h2>
          <div class="space-y-4 max-h-[310px] overflow-y-auto pr-2">
            {transactions.length > 0 ? transactions.map((tx: any) => (
              <div class="flex items-center justify-between border-b border-slate-800/50 pb-3 last:border-0 last:pb-0">
                <div class="flex-1 pr-4">
                  <p class="text-sm font-semibold text-slate-200 leading-tight mb-1">{tx.description || '-'}</p>
                  <p class="text-[10px] text-slate-500 font-mono">
                    {new Date(tx.created_at).toLocaleString('id-ID')}
                  </p>
                </div>
                <div class={`text-sm font-bold shrink-0 ${tx.type === 'credit' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'credit' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                </div>
              </div>
            )) : (
              <div class="text-center py-8">
                <span class="text-3xl mb-2 block opacity-50">🧾</span>
                <p class="text-xs text-slate-500">Belum ada riwayat transaksi saldo.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('depositForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('btnSubmit');
          const amount = document.getElementById('depositAmount').value;

          btn.disabled = true;
          btn.innerText = 'Membuat Tiket QRIS...';

          try {
            const res = await fetch('/api/user/v1/wallet/deposit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ amount: amount })
            });

            const data = await res.json();

            if (data.success) {
              document.getElementById('depositForm').classList.add('hidden');
              document.getElementById('qrisArea').classList.remove('hidden');
              document.getElementById('qrisArea').classList.add('flex');

              const encodedQris = encodeURIComponent(data.raw_qris);
              document.getElementById('qrisImage').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=' + encodedQris;
              
              document.getElementById('lblDepositId').innerText = data.deposit_id;
              document.getElementById('lblAmount').innerText = 'Rp ' + parseInt(data.amount).toLocaleString('id-ID');

              startCountdown(15 * 60);
              startPolling(data.deposit_id);
            } else {
              alert('Gagal: ' + data.message);
              btn.disabled = false;
              btn.innerText = 'Buat Tiket Deposit';
            }
          } catch (err) {
            alert('Terjadi kesalahan koneksi! Server tidak merespon.');
            btn.disabled = false;
            btn.innerText = 'Buat Tiket Deposit';
          }
        });

        function startCountdown(durationInSeconds) {
          let timer = durationInSeconds;
          const display = document.getElementById('countdownTimer');

          const interval = setInterval(() => {
            const minutes = parseInt(timer / 60, 10);
            const seconds = parseInt(timer % 60, 10);

            display.textContent = (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds;

            if (--timer < 0) {
              clearInterval(interval);
              display.textContent = "KADALUARSA";
              const statusBox = document.getElementById('paymentStatusBox');
              statusBox.className = "w-full max-w-sm px-4 py-3 bg-red-500/10 text-red-400 text-center rounded-xl text-sm font-semibold border border-red-500/20";
              statusBox.innerHTML = "Waktu Habis. Silakan muat ulang halaman.";
            }
          }, 1000);
        }

        function startPolling(depositId) {
          const pollInterval = setInterval(async () => {
            try {
              const res = await fetch('/api/user/v1/wallet/deposit/' + depositId + '/status');
              const data = await res.json();

              if (data.status === 'success') {
                clearInterval(pollInterval);
                const statusBox = document.getElementById('paymentStatusBox');
                statusBox.className = "w-full max-w-sm px-4 py-3 bg-emerald-500/10 text-emerald-400 text-center rounded-xl text-sm font-bold border border-emerald-500/20 shadow-lg shadow-emerald-500/10";
                statusBox.innerHTML = "✅ PEMBAYARAN BERHASIL DITERIMA!";

                setTimeout(() => { window.location.reload(); }, 3000);
              } 
              else if (data.status === 'failed' || data.status === 'cancelled') {
                clearInterval(pollInterval);
                const statusBox = document.getElementById('paymentStatusBox');
                statusBox.className = "w-full max-w-sm px-4 py-3 bg-red-500/10 text-red-400 text-center rounded-xl text-sm font-semibold border border-red-500/20";
                statusBox.innerHTML = "❌ Transaksi Dibatalkan/Gagal";
              }
            } catch (e) {
              console.error('Polling error', e);
            }
          }, 3000);
        }
      `}} />
    </div>,
    { title: 'My Wallet' }
  )
})
