import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // 1. Ambil semua widget yang aktif untuk posisi 'frontpage', urutkan berdasarkan sort_order
  const queryWidgets = `SELECT type, title, content FROM widgets WHERE placement = 'frontpage' AND status = 'active' ORDER BY sort_order ASC`
  const { results: widgets } = await c.env.DB.prepare(queryWidgets).all()

  // 2. Kita gunakan Promise.all untuk merender setiap widget karena ada widget (seperti grid produk) 
  // yang membutuhkan eksekusi ke database tambahan secara asinkron.
  const renderedWidgets = await Promise.all(
    widgets.map(async (widget: any) => {
      const data = JSON.parse(widget.content) // Parse JSON dari database

      // ==========================================
      // WIDGET 1: CAROUSEL BANNER (Slider Promo)
      // Format JSON: [{"image_url": "url_gambar", "link": "/promo1"}, ...]
      // ==========================================
      if (widget.type === 'carousel') {
        return (
          <div class="carousel-section w-full max-w-6xl mx-auto mt-4 px-4">
            {widget.title && <h2 class="text-xl font-bold mb-4 text-slate-100">{widget.title}</h2>}
            <div class="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 scroll-smooth" style="scrollbar-width: none;">
              {data.map((item: any) => (
                <a href={item.link} class="snap-center shrink-0 w-full md:w-3/4 rounded-2xl overflow-hidden block hover:opacity-90 transition-opacity">
                  <img src={item.image_url} alt="Promo Banner" class="w-full h-auto object-cover aspect-[21/9]" />
                </a>
              ))}
            </div>
          </div>
        )
      }

      // ==========================================
      // WIDGET 2: CATEGORY NAV / ICON LIST (Menu Cepat)
      // Format JSON: [{"image_url": "url_icon", "title": "Mobile Legends", "link": "/kategori/ml"}]
      // ==========================================
      if (widget.type === 'category_list') {
        return (
          <div class="category-nav w-full max-w-6xl mx-auto mt-6 px-4">
            {widget.title && <h2 class="text-xl font-bold mb-4 text-slate-100">{widget.title}</h2>}
            <div class="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-6">
              {data.map((item: any) => (
                <a href={item.link} class="flex flex-col items-center gap-2 group cursor-pointer">
                  <div class="w-14 h-14 md:w-16 md:h-16 rounded-full bg-slate-800 p-3 shadow-lg group-hover:bg-blue-600 group-hover:scale-105 transition-all duration-300">
                    <img src={item.image_url} alt={item.title} class="w-full h-full object-contain" />
                  </div>
                  <span class="text-[10px] md:text-xs text-center font-medium text-slate-300 group-hover:text-blue-400">
                    {item.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )
      }

      // ==========================================
      // WIDGET 3: PRODUCT GRID (Katalog Game/Pulsa Populer)
      // Format JSON: {"category_id": 1, "limit": 12} ATAU {"category_id": null, "limit": 6}
      // ==========================================
      if (widget.type === 'product_grid') {
        // Ambil pengaturan batas dan kategori dari JSON
        const limit = data.limit ? parseInt(data.limit) : 12
        const categoryId = data.category_id

        let productsQuery = ''
        let productsData = []

        // Tarik data produk LANGSUNG dari tabel products
        if (categoryId) {
          productsQuery = `SELECT id, name, price, image_url FROM products WHERE status = 'active' AND category_id = ? ORDER BY id DESC LIMIT ?`
          const result = await c.env.DB.prepare(productsQuery).bind(categoryId, limit).all()
          productsData = result.results
        } else {
          // Jika kategori tidak diset, ambil produk terbaru secara umum
          productsQuery = `SELECT id, name, price, image_url FROM products WHERE status = 'active' ORDER BY id DESC LIMIT ?`
          const result = await c.env.DB.prepare(productsQuery).bind(limit).all()
          productsData = result.results
        }

        return (
          <div class="product-section w-full max-w-6xl mx-auto mt-10 px-4">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-extrabold text-slate-100 flex items-center gap-2">
                <span class="w-1.5 h-6 bg-blue-500 rounded-full inline-block"></span>
                {widget.title || 'Produk Pilihan'}
              </h2>
              {categoryId && (
                <a href={`/kategori/${categoryId}`} class="text-xs text-blue-500 hover:text-blue-400 font-medium">Lihat Semua ❯</a>
              )}
            </div>

            <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-6 gap-3 md:gap-4">
              {productsData.map((product: any) => (
                <a href={`/order/${product.id}`} class="product-card block bg-slate-800 rounded-2xl p-2.5 shadow-sm border border-slate-700/50 hover:border-blue-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/20 transition-all duration-300">
                  <div class="w-full aspect-square rounded-xl overflow-hidden bg-slate-900 mb-3 relative">
                    <img 
                      src={product.image_url || 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg'} 
                      alt={product.name} 
                      class="w-full h-full object-cover" 
                    />
                    <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                  </div>
                  <h3 class="text-xs md:text-sm font-bold text-slate-200 truncate mb-1">
                    {product.name}
                  </h3>
                  <p class="text-[10px] md:text-xs font-semibold text-emerald-400">
                    Mulai Rp {product.price.toLocaleString('id-ID')}
                  </p>
                </a>
              ))}
              
              {/* Pesan jika produk kosong di kategori tersebut */}
              {productsData.length === 0 && (
                <div class="col-span-full py-8 text-center text-slate-500 text-sm bg-slate-800/50 rounded-2xl border border-dashed border-slate-700">
                  Belum ada produk di kategori ini.
                </div>
              )}
            </div>
          </div>
        )
      }

      // ==========================================
      // WIDGET 4: SEO HTML TEXT (Teks Panjang di Bawah)
      // Format JSON: {"html_content": "<p>Teks SEO...</p>"}
      // ==========================================
      if (widget.type === 'html_text') {
        return (
          <div class="seo-section w-full max-w-6xl mx-auto mt-16 px-4 pb-12">
            <div class="bg-slate-800/40 rounded-2xl p-6 border border-slate-800 text-slate-400 text-xs md:text-sm leading-relaxed prose prose-invert max-w-none prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline">
               <div dangerouslySetInnerHTML={{ __html: data.html_content }}></div>
            </div>
          </div>
        )
      }

      // Jika ada tipe widget lain yang belum terdaftar, jangan tampilkan apa-apa (null)
      return null
    })
  )

  // 3. Merender struktur halaman utama
  return c.render(
    <div class="frontpage-wrapper bg-slate-950 min-h-screen font-sans selection:bg-blue-500 selection:text-white">
      {/* Container utama widget yang sudah di-loop dan diproses */}
      <div class="widgets-container pt-6">
        {renderedWidgets}
      </div>
    </div>,
    { title: 'Topup Game & PPOB Termurah' }
  )
})
