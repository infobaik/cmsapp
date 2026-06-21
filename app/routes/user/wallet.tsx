import { createRoute } from 'honox/factory'
import { getUserWallet } from '../../../src/services/wallet'

export default createRoute(async (c) => {
  const user = c.get('user')!
  const wallet = await getUserWallet(c.env.DB, user.id) || { balance_available: 0, balance_pending: 0 }

  return c.render(
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl p-6 text-white shadow-lg">
        <p class="text-indigo-100 text-sm font-medium mb-1">Saldo Tersedia</p>
        <h2 class="text-3xl font-bold tracking-tight">Rp {wallet.balance_available.toLocaleString('id-ID')}</h2>
      </div>

      <div class="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-lg text-slate-800 mb-4">Deposit Saldo (Otomatis)</h3>

        {/* ============================================== */}
        /* FORM DEPOSIT (AKAN DISEMBUNYIKAN SAAT KLIK BAYAR) */
        {/* ============================================== */}
        <form id="depositForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-600 mb-2">Nominal Deposit (Min. Rp 10.000)</label>
            <input type="number" name="amount" id="depositAmount" min="10000" required class="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all" placeholder="Contoh: 50000" />
          </div>
          <button type="submit" id="btnSubmit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition-colors">
            Lanjutkan Pembayaran
          </button>
        </form>

        {/* ============================================== */}
        /* AREA QRIS (MUNCUL OTOMATIS BERKAT AJAX & JAVASCRIPT) */
        {/* ============================================== */}
        <div id="qrisArea" class="hidden mt-4 flex-col items-center justify-center p-6 border-2 border-dashed border-indigo-100 rounded-2xl bg-indigo-50/30">
          <h4 class="font-bold text-slate-800 text-lg mb-1">Scan QRIS untuk Membayar</h4>
          
          {/* COUNTDOWN TIMER 15 MENIT */}
          <p class="text-slate-500 text-sm mb-5">
            Sisa Waktu: <span id="countdownTimer" class="font-bold text-red-500 text-lg ml-1">15:00</span>
          </p>

          <div class="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 mb-5 relative">
             {/* GAMBAR QR CODE YANG DI-RENDER DARI RAW QRIS STRING */}
             <img id="qrisImage" src="" alt="QR Code Pembayaran" class="w-56 h-56 md:w-64 md:h-64 object-contain" />
          </div>

          <div class="text-center space-y-1 mb-6">
             <p class="text-sm font-medium text-slate-500">ID Tiket: <span id="lblDepositId" class="font-bold text-slate-700 font-mono"></span></p>
             <p class="text-sm font-medium text-slate-500">Total Transfer: <span id="lblAmount" class="font-bold text-indigo-600 text-xl block mt-1"></span></p>
          </div>

          {/* STATUS POLLING LIVE DARI DATABASE */}
          <div id="paymentStatusBox" class="w-full max-w-sm px-4 py-3 bg-amber-100 text-amber-700 text-center rounded-xl text-sm font-semibold animate-pulse border border-amber-200">
            <span class="inline-block animate-spin mr-2">⏳</span> Menunggu Pembayaran Anda...
          </div>
        </div>
      </div>

      {/* SCRIPT AJAX UNTUK MENGELOLA SEMUANYA TANPA PINDAH HALAMAN */}
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
              // 1. Sembunyikan Form, Tampilkan Layout QRIS
              document.getElementById('depositForm').classList.add('hidden');
              document.getElementById('qrisArea').classList.remove('hidden');
              document.getElementById('qrisArea').classList.add('flex');

              // 2. Render Raw QRIS menjadi Gambar menggunakan public API qrserver
              const encodedQris = encodeURIComponent(data.raw_qris);
              document.getElementById('qrisImage').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=' + encodedQris;
              
              // 3. Tulis Info ke Layar
              document.getElementById('lblDepositId').innerText = data.deposit_id;
              document.getElementById('lblAmount').innerText = 'Rp ' + parseInt(data.amount).toLocaleString('id-ID');

              // 4. Jalankan Waktu Mundur 15 Menit
              startCountdown(15 * 60);

              // 5. Jalankan Radar Polling ke Database
              startPolling(data.deposit_id);
            } else {
              alert('Gagal: ' + data.message);
              btn.disabled = false;
              btn.innerText = 'Lanjutkan Pembayaran';
            }
          } catch (err) {
            alert('Terjadi kesalahan koneksi! Server tidak merespon.');
            btn.disabled = false;
            btn.innerText = 'Lanjutkan Pembayaran';
          }
        });

        // MESIN COUNTDOWN 15 MENIT
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
              statusBox.className = "w-full max-w-sm px-4 py-3 bg-red-100 text-red-700 text-center rounded-xl text-sm font-semibold border border-red-200";
              statusBox.innerHTML = "Waktu Habis. Silakan ulangi proses deposit.";
            }
          }, 1000);
        }

        // MESIN POLLING DATABASE (Cek Saldo Masuk Setiap 3 Detik)
        function startPolling(depositId) {
          const pollInterval = setInterval(async () => {
            try {
              const res = await fetch('/api/user/v1/wallet/deposit/' + depositId + '/status');
              const data = await res.json();

              // Jika Webhook berhasil menembak database dan merubah status jadi success
              if (data.status === 'success') {
                clearInterval(pollInterval);
                const statusBox = document.getElementById('paymentStatusBox');
                statusBox.className = "w-full max-w-sm px-4 py-3 bg-emerald-100 text-emerald-700 text-center rounded-xl text-sm font-bold border border-emerald-200 shadow-lg shadow-emerald-500/20";
                statusBox.innerHTML = "✅ PEMBAYARAN BERHASIL DITERIMA!";

                // Reload halaman agar saldo terupdate di UI
                setTimeout(() => {
                  window.location.reload();
                }, 3000);
              } 
              // Jika ditolak / gagal
              else if (data.status === 'failed' || data.status === 'cancelled') {
                clearInterval(pollInterval);
                const statusBox = document.getElementById('paymentStatusBox');
                statusBox.className = "w-full max-w-sm px-4 py-3 bg-red-100 text-red-700 text-center rounded-xl text-sm font-semibold border border-red-200";
                statusBox.innerHTML = "❌ Transaksi Dibatalkan/Gagal";
              }
            } catch (e) {
              console.error('Polling gangguan', e);
            }
          }, 3000);
        }
      `}} />
    </div>,
    { title: 'Dompet Digital' }
  )
})
