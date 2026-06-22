// app/routes/admin/builder.tsx
import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  return c.render(
    <div class="h-screen w-full flex flex-col m-0 p-0 overflow-hidden">
      {/* Script & Style GrapesJS */}
      <link rel="stylesheet" href="https://unpkg.com/grapesjs@0.21.2/dist/css/grapes.min.css" />
      <script src="https://unpkg.com/grapesjs@0.21.2/dist/grapes.min.js"></script>

      {/* Topbar Admin Builder */}
      <div class="h-14 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 z-50">
        <div class="font-bold">✨ BlinkSite Web Builder</div>
        <div class="flex gap-3">
          <a href="/admin/dashboard" class="px-4 py-1.5 bg-slate-700 rounded text-sm hover:bg-slate-600 transition">Kembali</a>
          <button id="btn-save" class="px-6 py-1.5 bg-indigo-600 font-bold rounded text-sm hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30">
            SIMPAN BERANDA
          </button>
        </div>
      </div>

      {/* Area Kanvas GrapesJS */}
      <div id="gjs" class="flex-1 w-full"></div>

      <script dangerouslySetInnerHTML={{ __html: `
        async function initBuilder() {
          const editor = grapesjs.init({
            container: '#gjs',
            height: '100%',
            width: '100%',
            storageManager: false, // Matikan localstorage bawaan
            allowScripts: 1, // PENTING: Agar script widget tereksekusi
            canvas: { styles: ['https://cdn.tailwindcss.com'] } // Inject Tailwind ke kanvas
          });

          // 1. Load Widget dari Database API
          const res = await fetch('/api/admin/v1/builder/widgets');
          const widgets = await res.json();
          
          widgets.forEach(w => {
            // Daftarkan Komponen Logika
            editor.DomComponents.addType(w.id, {
               isComponent: el => el.getAttribute && el.getAttribute('data-gjs-type') === w.id,
               model: {
                 defaults: {
                   tagName: 'div',
                   attributes: { 'data-gjs-type': w.id },
                   traits: w.attributes.traits || []
                 },
                 script: w.script ? new Function(w.script) : undefined
               }
            });

            // Daftarkan Blok UI ke Panel Kanan
            editor.BlockManager.add(w.id, {
               label: w.label,
               category: w.category,
               content: w.content
            });
          });

          // 2. Load Desain Beranda (Homepage) Saat Ini
          const pageRes = await fetch('/api/admin/v1/builder/pages/homepage');
          const pageData = await pageRes.json();
          if (pageData.html_content) {
             editor.setComponents(pageData.html_content);
             editor.setStyle(pageData.css_content);
          }

          // 3. Aksi Simpan ke D1
          document.getElementById('btn-save').addEventListener('click', async () => {
             const btn = document.getElementById('btn-save');
             btn.innerText = "Menyimpan...";
             
             await fetch('/api/admin/v1/builder/pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                   slug: 'homepage', 
                   html: editor.getHtml(), 
                   css: editor.getCss() 
                })
             });
             
             btn.innerText = "SIMPAN BERANDA";
             alert('Beranda berhasil diperbarui!');
          });
        }
        
        initBuilder();
      `}} />
    </div>,
    { title: 'Page Builder' }
  )
})
