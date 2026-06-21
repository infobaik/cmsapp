import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // 🔥 PERBAIKAN FATAL: MENGGUNAKAN ID, BUKAN SLUG!
  const id = c.req.param('id')
  
  // 1. Ambil Data Kategori Saat Ini berdasarkan ID
  const category = await c.env.DB.prepare(`SELECT id, name, cover_url FROM categories WHERE id = ?`).bind(id).first()
  if (!category) return c.notFound()

  // 2. Ambil Pengaturan UI Global
  const { results: sysSettings } = await c.env.DB.prepare(`SELECT key, value FROM system_settings WHERE key LIKE 'ui_cat_%'`).all()
  const settings: Record<string, string> = {}
  sysSettings.forEach((row: any) => { settings[row.key] = row.value })

  // 3. CEK APAKAH ADA SUB-KATEGORI?
  const { results: subCategories } = await c.env.DB.prepare(`
    SELECT id, name, image_url, cover_url 
    FROM categories 
    WHERE parent_id = ? 
    ORDER BY name ASC
  `).bind(category.id).all()

  // 4. JIKA TIDAK ADA SUB-KATEGORI, BARU AMBIL PRODUKNYA
  let products: any[] = []
  if (subCategories.length === 0) {
    const { results } = await c.env.DB.prepare(`
      SELECT id, name, price, is_open_amount, image_url 
      FROM products 
      WHERE category_id = ? AND status = 'active' AND is_visible = 1
      ORDER BY price ASC
    `).bind(category.id).all()
    products = results
  }

  // Pengecekan Kategori Voucher untuk Peringatan Keamanan (Cek dari Nama)
  const isVoucher = category.name.toLowerCase().includes('voucher')

  // Logika CSS UI Kategori
  const coverVis = settings.ui_cat_cover_vis || 'all'
  const iconVis = settings.ui_cat_icon_vis || 'all'

  const getVisClass = (vis: string, defaultDisplay: string) => {
    if (vis === 'hidden') return 'hidden '
    if (vis === 'desktop') return `hidden md:${defaultDisplay} `
    if (vis === 'mobile') return `${defaultDisplay} md:hidden `
    return `${defaultDisplay} `
  }

  const coverClass = getVisClass(coverVis, 'block') + "absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
  const iconClass = getVisClass(iconVis, 'flex') + "w-8 h-8 md:w-10 md:h-10 mb-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/20 p-1.5 items-center justify-center shadow-lg group-hover:bg-white/30 transition-colors"

  return c.render(
    <div class="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* ======================================================== */}
      {/* HEADER KATEGORI (BANNER) */}
      {/* ======================================================== */}
      <div class="relative rounded-3xl overflow-hidden bg-slate-900 aspect-[4/1] md:aspect-[6/1] shadow-xl mt-4">
         <img src={category.cover_url || 'https://res.cloudinary.com/dqlxjihc9/image/upload/v1781792255/default-cover.png'} alt={category.name} class="absolute inset-0 w-full h-full object-cover opacity-40" />
         <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
         <div class="absolute bottom-0 left-0 p-6 md:p-8">
           <h1 class="text-3xl md:text-4xl font-extrabold text-white">{category.name}</h1>
           <p class="text-slate-300 mt-2 text-sm md:text-base">
             {subCategories.length > 0 ? 'Pilih layanan yang ingin Anda gunakan.' : 'Checkout instan. Tanpa daftar, langsung proses!'}
           </p>
         </div>
      </div>

      {subCategories.length > 0 ? (
        /* ======================================================== */
        /* FASE 1: TAMPILKAN GRID SUB-KATEGORI (JIKA ADA)           */
        /* ======================================================== */
        <div class="px-2 mt-8">
          <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3 md:gap-4">
            {subCategories.map((cat: any) => (
              <a 
                href={`/kategori/${cat.id}`} /* 🔥 PERBAIKAN: LINK MENGGUNAKAN ID */
                class="group relative block rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 aspect-[2/3] bg-gradient-to-br from-slate-800 to-slate-900 transform hover:-translate-y-1"
              >
                {coverVis !== 'hidden' && cat.cover_url && (
                  <img src={cat.cover_url} alt={cat.name} class={coverClass} />
                )}
                <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                <div class="absolute inset-x-0 bottom-0 p-3 flex flex-col items-start z-10">
                  {iconVis !== 'hidden' && (
                     <div class={iconClass}>
                       {cat.image_url ? (
                         <img src={cat.image_url} alt={cat.name} class="w-full h-full object-contain drop-shadow-md" />
                       ) : (
                         <div class="w-full h-full bg-slate-500/50 rounded flex items-center justify-center">
                           <span class="text-white text-xs font-bold">Ico</span>
                         </div>
                       )}
                     </div>
                  )}
                  <h3 class="font-bold text-white text-[12px] md:text-[14px] leading-snug line-clamp-2 drop-shadow-lg group-hover:text-indigo-300 transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* FASE 2: TAMPILKAN CHECKOUT PRODUK (JIKA TIDAK ADA SUB)   */
        /* ======================================================== */
        <>
          <div id="checkoutArea" class="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
             {/* KOLOM KIRI: INPUT DATA & DAFTAR PRODUK */}
             <div class="md:col-span-2 space-y-6">
                
                {/* 1. Form Input Target */}
                <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                   <h2 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <span class="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span> 
                     Data Tujuan
                   </h2>
                   <div class="space-y-4">
                     <div>
                       <label class="block text-sm font-semibold text-slate-600 mb-1">Nomor HP / Tujuan <span class="text-red-500">*</span></label>
                       <input type="text" id="customerNumber" required placeholder="Contoh: 08123456789" class="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all font-mono" />
                       {isVoucher && <p class="text-[11px] font-semibold text-amber-600 mt-1.5 flex gap-1"><svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg> Ingat Nomor HP ini! Ini adalah Password untuk melihat Kode Voucher nanti.</p>}
                     </div>
                     <div>
                       <label class="block text-sm font-semibold text-slate-600 mb-1">Email (Opsional)</label>
                       <input type="email" id="guestEmail" placeholder="Budi@gmail.com (Untuk kirim Invoice/Voucher)" class="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all" />
                     </div>
                   </div>
                </div>

                {/* 2. Pilih Produk */}
                <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
                   <h2 class="font-bold text-slate-800 mb-4 flex items-center gap-2">
                     <span class="bg-indigo-100 text-indigo-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span> 
                     Pilih Nominal
                   </h2>
                   
                   <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                     {products.length > 0 ? products.map((p: any) => (
                       <label class="relative cursor-pointer group h-full">
                         <input type="radio" name="product_id" value={p.id} data-price={p.price} data-name={p.name} data-is-open={p.is_open_amount} class="peer sr-only" />
                         <div class="border border-slate-200 rounded-xl p-4 text-center peer-checked:border-indigo-600 peer-checked:bg-indigo-50 hover:border-indigo-300 transition-all h-full flex flex-col justify-center min-h-[80px]">
                           <h3 class="font-bold text-slate-700 text-sm leading-tight">{p.name}</h3>
                           {p.is_open_amount === 1 ? (
                             <p class="text-xs text-slate-500 mt-1">+ Rp {p.price.toLocaleString('id-ID')} (Admin)</p>
                           ) : (
                             <p class="text-sm font-bold text-indigo-600 mt-1">Rp {p.price.toLocaleString('id-ID')}</p>
                           )}
                         </div>
                         <div class="absolute top-2 right-2 hidden peer-checked:block text-indigo-600 bg-white rounded-full">
                           <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                         </div>
                       </label>
                     )) : (
                       <div class="col-span-full py-8 text-center text-slate-400">Produk belum tersedia.</div>
                     )}
                   </div>

                   {/* Input Nominal Bebas */}
                   <div id="openAmountContainer" class="hidden mt-4 pt-4 border-t border-slate-100">
                     <label class="block text-sm font-semibold text-slate-600 mb-1">Nominal Topup (Min. Rp 1.000)</label>
                     <input type="number" id="openAmountInput" placeholder="Contoh: 150000" min="1000" class="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-3 outline-none transition-all font-mono font-bold text-indigo-700 text-lg" />
                   </div>
                </div>

             </div>

             {/* KOLOM KANAN: RINGKASAN PEMBAYARAN */}
             <div class="md:col-span-1">
                <div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm sticky top-6">
                   <h2 class="font-bold text-slate-800 mb-4 border-b border-slate-100 pb-3">Ringkasan Pesanan</h2>
                   <div class="space-y-3 text-sm mb-6 border-b border-slate-100 pb-4">
                     <div class="flex flex-col">
                       <span class="text-slate-400 text-xs uppercase font-bold tracking-wider mb-0.5">Produk</span>
                       <span id="summaryName" class="font-bold text-slate-700">-</span>
                     </div>
                     <div class="flex flex-col">
                       <span class="text-slate-400 text-xs uppercase font-bold tracking-wider mb-0.5">No Tujuan</span>
                       <span id="summaryTarget" class="font-bold text-slate-700 font-mono">-</span>
                     </div>
                   </div>
                   <div class="flex justify-between items-end mb-6">
                     <span class="text-slate-500 font-medium">Total Bayar</span>
                     <span id="summaryTotal" class="font-extrabold text-2xl text-indigo-600">Rp 0</span>
                   </div>
                   <button id="btnCheckout" disabled class="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-indigo-600/30">
                     Lanjutkan ke QRIS
                   </button>
                   <p class="text-[10px] text-center text-slate-400 mt-3 flex items-center justify-center gap-1">
                     <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                     Pembayaran aman dengan QRIS Otomatis
                   </p>
                </div>
             </div>
          </div>

          {/* AREA QRIS & STATUS */}
          <div id="qrisArea" class="hidden flex-col items-center justify-center bg-white border border-slate-200 p-6 md:p-10 rounded-3xl shadow-xl max-w-lg mx-auto mt-8">
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
                <div class="absolute -right-4 -top-4 text-emerald-500/20">
                  <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24"><path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/></svg>
                </div>
                <p class="text-emerald-700 font-bold mb-2 uppercase tracking-wide text-xs">KODE VOUCHER / SERIAL NUMBER (SN)</p>
                <div id="lblSn" class="font-mono text-xl md:text-2xl font-black text-emerald-800 break-all select-all relative z-10"></div>
             </div>
          </div>

          {/* SCRIPT KHUSUS UNTUK CHECKOUT */}
          <script dangerouslySetInnerHTML={{ __html: `
            const targetInput = document.getElementById('customerNumber');
            if (targetInput) {
                const radios = document.querySelectorAll('input[name="product_id"]');
                const openAmountContainer = document.getElementById('openAmountContainer');
                const openAmountInput = document.getElementById('openAmountInput');
                const btnCheckout = document.getElementById('btnCheckout');
                
                let selectedProduct = null;
                let currentPrice = 0;

                function updateSummary() {
                  const target = targetInput.value || '-';
                  document.getElementById('summaryTarget').innerText = target;

                  if (selectedProduct) {
                    document.getElementById('summaryName').innerText = selectedProduct.dataset.name;
                    
                    if (selectedProduct.dataset.isOpen === '1') {
                       const inputNominal = parseInt(openAmountInput.value) || 0;
                       currentPrice = inputNominal + parseInt(selectedProduct.dataset.price);
                    } else {
                       currentPrice = parseInt(selectedProduct.dataset.price);
                    }
                    document.getElementById('summaryTotal').innerText = 'Rp ' + currentPrice.toLocaleString('id-ID');
                    
                    if (target.length >= 4 && currentPrice > 0) {
                      btnCheckout.disabled = false;
                    } else {
                      btnCheckout.disabled = true;
                    }
                  }
                }

                radios.forEach(r => {
                  r.addEventListener('change', (e) => {
                    selectedProduct = e.target;
                    if (selectedProduct.dataset.isOpen === '1') {
                      openAmountContainer.classList.remove('hidden');
                    } else {
                      openAmountContainer.classList.add('hidden');
                    }
                    updateSummary();
                  });
                });

                targetInput.addEventListener('input', updateSummary);
                openAmountInput.addEventListener('input', updateSummary);

                let pollInterval = null;

                btnCheckout.addEventListener('click', async () => {
                   const phone = targetInput.value;
                   const email = document.getElementById('guestEmail').value;
                   const productId = selectedProduct.value;
                   const amount = selectedProduct.dataset.isOpen === '1' ? openAmountInput.value : 0;

                   btnCheckout.disabled = true;
                   btnCheckout.innerHTML = '<span class="inline-block animate-spin mr-2">↻</span> Memproses...';

                   try {
                     const res = await fetch('/api/public/v1/checkout', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                       body: newSearchParams({ product_id: productId, customer_number: phone, guest_email: email, amount: amount })
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
                        body: new URLSearchParams({ order_id: orderId, phone: phone })
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
                
                function newSearchParams(obj) {
                    return Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
                }
            }
          `}} />
        </>
      )}
    </div>
  )
})
