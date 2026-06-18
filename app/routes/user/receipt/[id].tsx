import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const trxId = c.req.param('id')
  const userId = c.get('ui_user_id')
  
  // Mengambil detail transaksi secara lengkap (join dengan products, categories, dan users)
  const query = `
    SELECT 
      t.*, 
      p.name as product_name, 
      c.name as category_name, 
      c.image_url as brand_icon,
      u.name as user_name
    FROM transactions t
    JOIN products p ON t.product_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ? AND t.user_id = ?
  `
  const trx = await c.env.DB.prepare(query).bind(trxId, userId).first()

  if (!trx) {
     return c.render(
        <div class="max-w-md mx-auto text-center py-20">
           <h1 class="text-xl font-bold text-slate-200">Transaksi Tidak Ditemukan</h1>
           <a href="/user/history" class="text-blue-500 text-sm mt-4 inline-block">Kembali ke Riwayat</a>
        </div>
     )
  }

  // Tentukan Status untuk Struk
  let statusText = 'PENDING'
  let statusColor = 'text-amber-500'
  if (trx.status === 'success') { statusText = 'BERHASIL'; statusColor = 'text-emerald-500' }
  else if (trx.status === 'failed') { statusText = 'GAGAL'; statusColor = 'text-red-500' }

  return c.render(
    <div class="max-w-2xl mx-auto pb-10">
      
      {/* CSS KHUSUS UNTUK PRINT (Menghilangkan elemen lain selain struk saat di-print PDF) */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #receipt-area, #receipt-area * { visibility: visible; }
          #receipt-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div class="mb-6 flex items-center gap-4 no-print">
        <a href="/user/history" class="p-2.5 bg-[#18181b] border border-slate-800/60 rounded-xl text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
        </a>
        <h1 class="text-2xl font-bold text-slate-100">Detail Struk</h1>
      </div>

      {/* AREA STRUK (Ini yang akan di-capture jadi PNG atau PDF) */}
      <div id="receipt-area" class="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-sm mx-auto text-slate-800 relative">
         
         {/* Aksen atas struk */}
         <div class="h-2 w-full bg-blue-600"></div>
         
         <div class="p-6 md:p-8">
            <div class="text-center mb-6 border-b border-dashed border-slate-300 pb-6">
               {trx.brand_icon ? (
                  <img src={trx.brand_icon as string} alt="Brand" class="w-14 h-14 mx-auto mb-3 object-contain" crossorigin="anonymous" />
               ) : (
                  <div class="w-14 h-14 mx-auto mb-3 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
                     <svg width="24" height="24" class="text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
               )}
               <h2 class="text-xl font-black text-slate-900 tracking-tight leading-none mb-1">BUKTI TRANSAKSI</h2>
               <p class="text-xs text-slate-500 uppercase tracking-widest font-semibold">{trx.category_name}</p>
            </div>

            <div class="space-y-4 mb-6">
               <div class="flex justify-between items-start text-sm">
                  <span class="text-slate-500">No. Trx</span>
                  <span class="font-semibold text-right break-all max-w-[150px]">{trx.id}</span>
               </div>
               <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-500">Tanggal</span>
                  <span class="font-semibold">{new Date(trx.created_at as string).toLocaleString('id-ID')}</span>
               </div>
               <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-500">Tujuan</span>
                  <span class="font-bold text-blue-600 text-base">{trx.customer_number}</span>
               </div>
               <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-500">Produk</span>
                  <span class="font-semibold text-right max-w-[160px] leading-tight">{trx.product_name}</span>
               </div>
               <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-500">Member</span>
                  <span class="font-semibold">{trx.user_name}</span>
               </div>
               <div class="flex justify-between items-center text-sm">
                  <span class="text-slate-500">Status</span>
                  <span class={`font-black tracking-widest ${statusColor}`}>{statusText}</span>
               </div>
            </div>

            {/* Serial Number / SN jika ada */}
            {trx.provider_response && trx.status === 'success' && (
              <div class="mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                 <p class="text-[10px] text-slate-500 font-bold uppercase mb-1">Serial Number (SN) / Token</p>
                 <p class="text-sm font-mono font-bold text-slate-800 break-all">{trx.provider_response}</p>
              </div>
            )}

            <div class="border-t-2 border-dashed border-slate-300 pt-5 mt-2 flex justify-between items-center">
               <span class="text-sm font-bold text-slate-500 uppercase tracking-widest">Total Bayar</span>
               <span class="text-xl font-black text-slate-900">Rp {(trx.total_price as number).toLocaleString('id-ID')}</span>
            </div>
         </div>
         
         {/* Footer Struk */}
         <div class="bg-slate-50 p-4 text-center border-t border-slate-200">
            <p class="text-[10px] text-slate-400 font-medium">Struk ini adalah bukti pembayaran yang sah.<br/>Terima kasih telah bertransaksi.</p>
         </div>
      </div>

      {/* ============================================================== */}
      {/* 3 TOMBOL AKSI UTAMA (Di bawah Struk, tidak ikut ke-print)      */}
      {/* ============================================================== */}
      <div class="max-w-sm mx-auto mt-6 grid grid-cols-3 gap-3 no-print">
         
         {/* 1. Tombol Cetak PDF */}
         <button onclick="window.print()" class="flex flex-col items-center justify-center p-3 bg-[#18181b] hover:bg-slate-800 border border-slate-800/60 rounded-2xl text-slate-300 transition-colors group">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="mb-1.5 text-blue-500 group-hover:scale-110 transition-transform"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            <span class="text-xs font-semibold">Print PDF</span>
         </button>

         {/* 2. Tombol Download PNG */}
         <button onclick="downloadPNG()" class="flex flex-col items-center justify-center p-3 bg-[#18181b] hover:bg-slate-800 border border-slate-800/60 rounded-2xl text-slate-300 transition-colors group relative overflow-hidden">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="mb-1.5 text-emerald-500 group-hover:scale-110 transition-transform"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            <span class="text-xs font-semibold">Simpan PNG</span>
         </button>

         {/* 3. Tombol Bagikan (Medsos / WA) */}
         <button onclick="shareReceipt()" class="flex flex-col items-center justify-center p-3 bg-[#18181b] hover:bg-slate-800 border border-slate-800/60 rounded-2xl text-slate-300 transition-colors group">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" class="mb-1.5 text-purple-500 group-hover:scale-110 transition-transform"><path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
            <span class="text-xs font-semibold">Bagikan</span>
         </button>
      </div>

      {/* ============================================================== */}
      {/* SCRIPT CLIENT-SIDE: UNTUK HTML2CANVAS & WEB SHARE API          */}
      {/* ============================================================== */}
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
      <script dangerouslySetInnerHTML={{
         __html: `
           // FUNGSI 1: DOWNLOAD SEBAGAI PNG
           function downloadPNG() {
              const receiptElement = document.getElementById('receipt-area');
              
              // Memberikan background warna putih mutlak sebelum capture agar tidak transparan
              const originalBg = receiptElement.style.backgroundColor;
              receiptElement.style.backgroundColor = '#ffffff';

              html2canvas(receiptElement, { 
                 scale: 2, // Resolusi tinggi (Retina)
                 useCORS: true, // Mengizinkan load gambar logo dari domain lain (Cloudinary)
                 backgroundColor: '#ffffff'
              }).then(canvas => {
                 receiptElement.style.backgroundColor = originalBg; // Kembalikan warna
                 
                 const link = document.createElement('a');
                 link.download = 'STRUK-${trx.id}.png';
                 link.href = canvas.toDataURL('image/png');
                 link.click();
              }).catch(err => {
                 alert('Gagal membuat gambar PNG. Pastikan koneksi stabil.');
                 console.error(err);
              });
           }

           // FUNGSI 2: BAGIKAN KE MEDSOS / WHATSAPP
           function shareReceipt() {
              const shareData = {
                 title: 'Struk Transaksi ${trx.product_name}',
                 text: 'Bukti Pembayaran\\nProduk: ${trx.product_name}\\nTujuan: ${trx.customer_number}\\nStatus: ${statusText}\\nTerima kasih!',
                 url: window.location.href // Menyertakan link halaman ini
              };

              if (navigator.share) {
                 navigator.share(shareData)
                    .then(() => console.log('Struk berhasil dibagikan'))
                    .catch((err) => console.log('Membatalkan share atau error:', err));
              } else {
                 // Fallback untuk browser PC lama
                 alert('Fitur Share otomatis tidak didukung di browser ini. Link struk telah disalin ke clipboard!');
                 navigator.clipboard.writeText(window.location.href);
              }
           }
         `
      }}></script>

    </div>,
    { title: `Struk - ${trx.id}` }
  )
})
