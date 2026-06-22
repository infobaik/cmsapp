// app/routes/index.tsx
import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // 1. Ambil desain Halaman Utama dari Database
  const page = await c.env.DB.prepare(`SELECT html_content, css_content FROM pages WHERE slug = 'homepage'`).first()

  // 2. Jika admin belum pernah membuat/menyimpan desain dari Page Builder
  if (!page || !page.html_content) {
    return c.render(
      <div class="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <h1 class="text-2xl font-bold text-slate-800 mb-2">Beranda Belum Didesain</h1>
        <p class="text-slate-500 mb-6">Silakan buat desain halaman depan melalui Panel Admin.</p>
        <a href="/admin/builder" class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition">
          Buka Page Builder
        </a>
      </div>,
      { title: 'Beranda' }
    )
  }

  // 3. Ambil "Nyawa" (Logika Script) dari seluruh Widget
  const { results: widgets } = await c.env.DB.prepare(`SELECT id, script FROM widgets WHERE script IS NOT NULL AND script != ''`).all()
  
  // 4. Siapkan Widget Engine
  // Engine ini bertugas mencari semua div yang memiliki atribut `data-gjs-type`
  // lalu mengeksekusi script JavaScript-nya (misal: memuat produk API, memutar Slider)
  const scriptMap = widgets.map((w: any) => `"${w.id}": function() { ${w.script} }`).join(',')
  const widgetEngine = `
    (function() {
        const widgetRegistry = { ${scriptMap} };
        document.addEventListener("DOMContentLoaded", function() {
            const components = document.querySelectorAll('[data-gjs-type]');
            components.forEach(el => {
                const type = el.getAttribute('data-gjs-type');
                if (widgetRegistry[type]) {
                    try { 
                      widgetRegistry[type].call(el); 
                    } catch(e) { 
                      console.error('Error saat menjalankan widget ' + type + ':', e); 
                    }
                }
            });
        });
    })();
  `

  // 5. Render ke Publik
  return c.render(
    <div class="public-frontend w-full min-h-screen relative">
       {/* Inject CSS dari GrapesJS */}
       <style dangerouslySetInnerHTML={{ __html: page.css_content as string }} />
       
       {/* Inject HTML dari GrapesJS */}
       <div dangerouslySetInnerHTML={{ __html: page.html_content as string }} />
       
       {/* Inject Engine Pemicu Nyawa Widget */}
       <script dangerouslySetInnerHTML={{ __html: widgetEngine }} />
    </div>,
    { title: 'SistemCo - Beranda' }
  )
})
