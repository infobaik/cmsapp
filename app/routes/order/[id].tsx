// app/routes/order/[id].tsx
import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const id = c.req.param('id')

  // Ambil detail produk berserta data kategori induknya
  const product = await c.env.DB.prepare(`
    SELECT p.*, c.name as category_name, c.image_url as category_image, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ? AND p.status = 'active'
  `).bind(id).first()

  if (!product) return c.notFound()

  const categoryName = String(product.category_name || '')
  const isVoucher = categoryName.toLowerCase().includes('voucher')

  return c.render(
    <div class="max-w-2xl mx-auto space-y-6 pb-12 mt-8 px-4">
      
      {/* HEADER NAVIGASI */}
      <div class="flex items-center gap-4 px-1 mb-6">
        <a href="javascript:history.back()" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 hover:bg-slate-50 transition-colors text-slate-600">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </a>
        <h1 class="text-xl font-bold text-slate-800">Checkout Publik</h1>
      </div>

      {/* FORM PEMESANAN */}
      <div id="checkoutArea" class="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div class="p-6 md:p-8">
          
          {/* Info Produk */}
          <div class="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            {product.category_image && (
               <img src={product.category_image as string} alt={categoryName} class="w-14 h-14 object-contain p-1 bg-slate-50 rounded-xl border border-slate-100" />
            )}
            <div>
               <h1 class="text-lg md:text-xl font-bold text-slate-800 leading-tight">{product.name}</h1>
               <p class="text-sm text-slate-500 mt-1">{categoryName} &bull; {product.order_type === 'inquiry' ? 'Tagihan Pascabayar' : 'Topup Otomatis'}</p>
            </div>
          </div>

          <div class="space-y-6">
            <input type="hidden" id="productId" value={product.id as number} data-price={product.price} data-is-open={product.is_open_amount} />
            
            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 ml-1">Nomor Tujuan / ID Pelanggan <span class="text-red-500">*</span></label>
              <input type="text" id="customerNumber" required placeholder="Contoh: 081234567890 / ID Akun" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-slate-400" />
              {product.description && (
                <p class="text-[11px] text-slate-500 ml-1 mt-1 leading-relaxed">{product.description}</p>
              )}
              {isVoucher && <p class="text-[11px] font-semibold text-amber-600 mt-1.5 ml-1 flex gap-1"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Ingat Nomor HP ini! Ini adalah Password untuk melihat Kode Voucher nanti.</p>}
            </div>

            <div class="space-y-2">
              <label class="text-sm font-bold text-slate-700 ml-1">Email (Opsional)</label>
              <input type="email" id="guestEmail" placeholder="Budi@gmail.com (Untuk Invoice/Voucher)" class="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 font-medium focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder-slate-400" />
            </div>

            {/* 💡 LOGIKA UI OPEN AMOUNT (BEBAS NOMINAL) */}
            {product.is_open_amount === 1 ? (
              <div class="space-y-2 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <label class="text-sm font-bold text-slate-700 ml-1">Nominal Topup (Min. Rp 1.000)</label>
                <div class="relative">
                  <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">Rp</span>
                  <input type="number" id="inputAmount" min="1000" required placeholder="Ketik nominal..." class="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-lg font-bold text-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" />
                </div>
                <div class="flex justify-between items-center px-1 pt-3 border-t border-slate-200/60 mt-3">
                  <span class="text-sm text-slate-500">Biaya Layanan (Admin)</span>
                  <span class="text-sm font-bold text-slate-700" id="adminFee" data-fee={product.price}>+ Rp {Number(product.price).toLocaleString('id-ID')}</span>
                </div>
              </div>
            ) : (
              <div class="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 flex justify-between items-center">
                <span class="font-medium text-indigo-900">Total Pembayaran</span>
                <span class="text-xl font-bold text-indigo-600">Rp {Number(product.price).toLocaleString('id-ID')}</span>
              </div>
            )}

            <div class="pt-4 border-t border-slate-100">
              <div class="flex justify-between items-end mb-4 px-1">
                <span class="text-slate-500 font-medium">Total Bayar</span>
                <span id="summaryTotal" class="font-extrabold text-2xl text-indigo-600">Rp {product.is_open_amount === 1 ? '0' : Number(product.price).toLocaleString('id-ID')}</span>
              </div>
              <button id="btnCheckout" disabled class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-lg">
                Lanjutkan ke QRIS
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* QRIS AREA */}
      <div id="qrisArea" class="hidden flex-col items-center justify-center bg-white border border-slate-200 p-6 md:p-10 rounded-[2rem] shadow-xl">
         <div class="text-center mb-6">
           <h3 class="text-2xl font-black text-slate-800">Selesaikan Pembayaran</h3>
           <p class="text-slate-500 text-sm mt-1">Scan kode QRIS di bawah ini menggunakan M-Banking atau E-Wallet Anda.</p>
         </div>

         <div class="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm mb-6 relative">
           <img id="qrisImage" src="" alt="QRIS" class="w-64 h-64 md:w-72 md:h-72 object-contain mx-auto" />
         </div>

         <div class="w-full space-y-3 mb-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
           <div class="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
             <span class="text-slate-500">Order ID</span>
             <span id="lblOrderId" class="font-mono font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-xs select-all cursor-copy"></span>
           </div>
           <div class="flex justify-between items-center text-sm border-b border-slate-200 pb-2">
             <span class="text-slate-500">Total Tagihan</span>
             <span id="lblQrisAmount" class="font-bold text-indigo-600 text-lg leading-none"></span>
           </div>
           <div class="flex justify-between items-center text-sm">
             <span class="text-slate-500">Batas Waktu</span>
             <span id="countdownTimer" class="font-bold text-red-500 text-base">15:00</span>
           </div>
         </div>

         <div id="paymentStatusBox" class="w-full px-4 py-3 bg-amber-100 text-amber-700 text-center rounded-xl text-sm font-semibold animate-pulse border border-amber-200 mb-4">
           <span class="inline-block animate-spin mr-2">⏳</span> Mengecek pembayaran otomatis...
         </div>

         <div id="voucherArea" class="hidden w-full p-6 bg-emerald-50 border-2 border-dashed border-emerald-300 rounded-2xl text-center mt-2 relative overflow-hidden">
            <p class="text-emerald-700 font-bold mb-2 uppercase tracking-wide text-xs">KODE VOUCHER / SERIAL NUMBER (SN)</p>
            <div id="lblSn" class="font-mono text-xl md:text-2xl font-black text-emerald-800 break-all select-all relative z-10"></div>
         </div>
      </div>

      {/* SCRIPT LOGIKA CHECKOUT PUBLIK */}
      <script dangerouslySetInnerHTML={{__html: `
        const targetInput = document.getElementById('customerNumber');
        const btnCheckout = document.getElementById('btnCheckout');
        const inputAmount = document.getElementById('inputAmount');
        const totalDisplay = document.getElementById('summaryTotal');
        const prodEl = document.getElementById('productId');
        
        const isOpen = prodEl.dataset.isOpen === '1';
        const basePrice = parseInt(prodEl.dataset.price) || 0;
        let currentPrice = isOpen ? 0 : basePrice;

        function validateForm() {
          const target = targetInput.value || '';
          if (isOpen) {
            const val = parseInt(inputAmount.value) || 0;
            currentPrice = val > 0 ? (val + basePrice) : 0;
            totalDisplay.innerText = 'Rp ' + currentPrice.toLocaleString('id-ID');
            btnCheckout.disabled = !(target.length >= 4 && val >= 1000);
          } else {
            btnCheckout.disabled = target.length < 4;
          }
        }

        targetInput.addEventListener('input', validateForm);
        if (inputAmount) inputAmount.addEventListener('input', validateForm);

        let pollInterval = null;

        btnCheckout.addEventListener('click', async () => {
           const phone = targetInput.value;
           const email = document.getElementById('guestEmail').value;
           const productId = prodEl.value;
           const amount = isOpen ? inputAmount.value : 0;

           btnCheckout.disabled = true;
           btnCheckout.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> Memproses...';

           try {
             // Tembak API Checkout Publik
             const res = await fetch('/api/public/v1/checkout', {
               method: 'POST',
               headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
               body: Object.keys({ product_id: productId, customer_number: phone, guest_email: email, amount: amount }).map(k => encodeURIComponent(k) + '=' + encodeURIComponent({ product_id: productId, customer_number: phone, guest_email: email, amount: amount }[k])).join('&')
             });
             
             const data = await res.json();
             
             if (data.success) {
                document.getElementById('checkoutArea').classList.add('hidden');
                document.getElementById('qrisArea').classList.remove('hidden');
                document.getElementById('qrisArea').classList.add('flex');

                const encodedQris = encodeURIComponent(data.raw_qris);
                document.getElementById('qrisImage').src = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=' + encodedQris;
                
                document.getElementById('lblOrderId').innerText = data.order_id;
                document.getElementById('lblQrisAmount').innerText = 'Rp ' + parseInt(data.total_price).toLocaleString('id-ID');

                startCountdown(15 * 60);
                startPolling(data.order_id, phone);

                window.scrollTo({ top: 0, behavior: 'smooth' });
             } else {
                alert('Gagal: ' + data.message);
                btnCheckout.disabled = false;
                btnCheckout.innerText = 'Lanjutkan ke QRIS';
             }
           } catch (e) {
             alert('Terjadi kesalahan jaringan.');
             btnCheckout.disabled = false;
             btnCheckout.innerText = 'Lanjutkan ke QRIS';
           }
        });

        function startCountdown(duration) {
          let timer = duration;
          const display = document.getElementById('countdownTimer');
          const interval = setInterval(() => {
            const m = parseInt(timer / 60, 10);
            const s = parseInt(timer % 60, 10);
            display.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
            
            if (--timer < 0) {
              clearInterval(interval);
              display.textContent = "KADALUARSA";
              if (pollInterval) clearInterval(pollInterval);
              const box = document.getElementById('paymentStatusBox');
              box.className = "w-full px-4 py-3 bg-red-100 text-red-700 text-center rounded-xl text-sm font-semibold border border-red-200 mb-4";
              box.innerHTML = "Waktu Habis. Silakan muat ulang halaman.";
            }
          }, 1000);
        }

        function startPolling(orderId, phone) {
          pollInterval = setInterval(async () => {
            try {
              const res = await fetch('/api/public/v1/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: Object.keys({ order_id: orderId, phone: phone }).map(k => encodeURIComponent(k) + '=' + encodeURIComponent({ order_id: orderId, phone: phone }[k])).join('&')
              });
              const json = await res.json();
              
              if (json.success) {
                const st = json.data.status;
                if (st === 'success') {
                   clearInterval(pollInterval);
                   const box = document.getElementById('paymentStatusBox');
                   box.className = "w-full px-4 py-4 bg-emerald-100 text-emerald-700 text-center rounded-2xl text-sm font-bold border border-emerald-300 mb-4 shadow-lg shadow-emerald-500/20";
                   box.innerHTML = "✅ PEMBAYARAN BERHASIL! Pesanan telah masuk.";
                   
                   if (json.data.sn) {
                      document.getElementById('voucherArea').classList.remove('hidden');
                      document.getElementById('lblSn').innerText = json.data.sn;
                   }
                } else if (st === 'failed') {
                   clearInterval(pollInterval);
                   const box = document.getElementById('paymentStatusBox');
                   box.className = "w-full px-4 py-4 bg-red-100 text-red-700 text-center rounded-2xl text-sm font-semibold border border-red-300 mb-4";
                   box.innerHTML = "❌ PESANAN GAGAL/DIBATALKAN. Silakan hubungi CS.";
                }
              }
            } catch (e) {}
          }, 3000);
        }
      `}} />
    </div>
  )
})
