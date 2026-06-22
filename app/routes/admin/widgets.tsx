import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const htmlContent = `
    <script src="https://cdn.tailwindcss.com"></script>
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
    <script src="https://unpkg.com/@phosphor-icons/web"></script>
    <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <style>
        [x-cloak] { display: none !important; }
        .code-input { font-family: 'Consolas', 'Monaco', monospace; font-size: 13px; background: #1e1e1e; color: #d4d4d4; line-height: 1.5; }
    </style>

    <div class="bg-gray-50 transition-colors duration-200" x-data="widgetApp()" x-init="init()">
        
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 class="font-black text-2xl text-slate-800">Manajemen Widget</h1>
                <p class="text-slate-500 text-sm">Buat dan kelola komponen blok untuk Page Builder.</p>
            </div>
            <div class="flex gap-2 w-full md:w-auto">
                <div class="relative w-full md:w-64">
                    <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" x-model="search" placeholder="Cari widget..." class="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm shadow-sm">
                </div>
                <button @click="openModal()" class="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg text-sm shadow-lg hover:bg-indigo-700 transition flex items-center gap-2 whitespace-nowrap">
                    <i class="ph ph-plus-bold"></i> Tambah Widget
                </button>
            </div>
        </div>

        <div x-show="loading" class="text-center py-20">
            <i class="ph ph-spinner animate-spin text-4xl text-indigo-600"></i>
            <p class="text-gray-500 mt-2 text-sm">Memuat Widget...</p>
        </div>

        <div x-show="!loading" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
            <template x-for="widget in filteredWidgets" :key="widget.id">
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden group">
                    <div class="p-4 border-b bg-gray-50 flex justify-between items-start">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-1 rounded border border-indigo-100" x-text="widget.category"></span>
                            <h3 class="font-bold text-gray-800 mt-2 text-lg" x-text="widget.label"></h3>
                            <p class="text-xs font-mono text-gray-400 mt-1" x-text="widget.id"></p>
                        </div>
                        <div class="text-gray-300"><i class="ph ph-cube text-3xl"></i></div>
                    </div>
                    <div class="p-4 flex-1 relative group-hover:bg-gray-50 transition">
                        <div class="text-xs text-gray-500 line-clamp-3 font-mono bg-gray-100 p-2 rounded border select-none" x-text="widget.content"></div>
                        <div class="mt-3 flex gap-2">
                            <span x-show="widget.script" class="text-[10px] flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded font-bold border border-amber-200"><i class="ph ph-code"></i> Punya Logika JS</span>
                        </div>
                    </div>
                    <div class="p-3 bg-white border-t flex gap-2">
                        <button @click="openModal(widget)" class="flex-1 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-bold text-gray-700 hover:border-indigo-500 hover:text-indigo-600 transition">EDIT WIDGET</button>
                        <button @click="deleteWidget(widget.id)" class="px-3 py-2 bg-red-50 border border-red-100 rounded text-xs font-bold text-red-600 hover:bg-red-100 transition"><i class="ph ph-trash text-lg"></i></button>
                    </div>
                </div>
            </template>
        </div>

        <div x-show="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" x-cloak>
            <div class="bg-white w-full h-full md:h-[95vh] md:w-[95vw] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                
                <div class="p-4 border-b flex justify-between items-center bg-gray-50 shrink-0">
                    <div class="flex items-center gap-4 w-full md:w-auto overflow-x-auto">
                        <h3 class="font-bold text-lg whitespace-nowrap text-slate-800" x-text="isEdit ? 'Edit Widget' : 'Buat Widget Baru'"></h3>
                        <div class="flex gap-2">
                            <input x-model="form.id" :disabled="isEdit" class="px-3 py-1.5 bg-white border rounded-lg text-sm font-mono focus:border-indigo-500 outline-none w-32" placeholder="ID (unik)">
                            <input x-model="form.label" class="px-3 py-1.5 bg-white border rounded-lg text-sm focus:border-indigo-500 outline-none" placeholder="Label Widget">
                            <select x-model="form.category" class="px-3 py-1.5 bg-white border rounded-lg text-sm focus:border-indigo-500 outline-none">
                                <option value="1. Hero Banner">1. Hero Banner</option>
                                <option value="2. Produk / Kategori">2. Produk / Kategori</option>
                                <option value="3. Konten & Info">3. Konten & Info</option>
                                <option value="4. Footer">4. Footer</option>
                                <option value="Custom">Custom</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex gap-3 ml-4">
                        <button @click="showModal = false" class="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition">Tutup</button>
                        <button @click="saveWidget()" class="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center gap-2">
                            <i class="ph ph-floppy-disk"></i> <span x-text="isSaving ? 'Menyimpan...' : 'SIMPAN'"></span>
                        </button>
                    </div>
                </div>
                
                <div class="flex-1 flex flex-col md:flex-row overflow-hidden">
                    <div class="w-full md:w-1/2 flex flex-col border-r bg-[#1e1e1e]">
                        <div class="flex bg-[#252526] text-gray-400 text-xs font-bold border-b border-[#333] overflow-x-auto">
                            <button @click="codeTab='html'" class="px-6 py-3 hover:bg-[#3e3e42] transition whitespace-nowrap" :class="codeTab==='html' ? 'bg-[#1e1e1e] text-white border-t-2 border-indigo-500' : ''">HTML Struktur</button>
                            <button @click="codeTab='js'" class="px-6 py-3 hover:bg-[#3e3e42] transition whitespace-nowrap" :class="codeTab==='js' ? 'bg-[#1e1e1e] text-white border-t-2 border-amber-500' : ''">Logika JS (Script)</button>
                            <button @click="codeTab='config'" class="px-6 py-3 hover:bg-[#3e3e42] transition whitespace-nowrap" :class="codeTab==='config' ? 'bg-[#1e1e1e] text-white border-t-2 border-purple-500' : ''">Pengaturan Panel (JSON)</button>
                        </div>

                        <textarea x-show="codeTab==='html'" x-model="form.content" @input.debounce.500ms="renderPreview()" class="flex-1 w-full p-4 code-input outline-none resize-none" spellcheck="false" placeholder="<div class='bg-white p-4'>Ketik HTML disini...</div>"></textarea>
                        
                        <div x-show="codeTab==='js'" class="flex-1 flex flex-col">
                            <div class="p-3 bg-amber-900/20 text-amber-200 text-xs border-b border-amber-900/50 px-4">
                                <i class="ph ph-info font-bold"></i> Gunakan <code>this</code> untuk memanipulasi elemen DOM dari widget ini (contoh: <code>this.querySelector('button')</code>).
                            </div>
                            <textarea x-model="form.script" @input.debounce.1000ms="renderPreview()" class="flex-1 w-full p-4 code-input outline-none resize-none" spellcheck="false" placeholder="// Tulis fungsi fetch API atau manipulasi DOM..."></textarea>
                        </div>

                        <div x-show="codeTab==='config'" class="flex-1 flex flex-col">
                            <div class="p-3 bg-purple-900/20 text-purple-200 text-xs border-b border-purple-900/50 px-4">
                                <i class="ph ph-warning font-bold"></i> Harus berformat JSON valid. Digunakan untuk memunculkan kolom input di Panel Kanan GrapesJS (Traits).
                            </div>
                            <textarea x-model="form.attributes" class="flex-1 w-full p-4 code-input outline-none resize-none" spellcheck="false" placeholder='{ "traits": [] }'></textarea>
                        </div>
                    </div>
                    
                    <div class="w-full md:w-1/2 bg-slate-100 flex flex-col relative">
                        <div class="bg-white border-b px-4 py-3 flex justify-between items-center text-xs font-bold text-slate-500 shadow-sm z-10">
                            <span>LIVE PREVIEW <span class="text-[10px] font-normal text-slate-400 ml-2">(Auto Reload)</span></span>
                            <span class="bg-emerald-100 text-emerald-600 px-2 py-1 rounded">TailwindCSS Ready</span>
                        </div>
                        <div class="flex-1 relative overflow-hidden bg-slate-200 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZjFmNWY5Ij48L3JlY3Q+CjxwYXRoIGQ9Ik0wIDBMOCA4Wk04IDBMMCA4WiIgc3Ryb2tlPSIjZTJlOGYwIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KPC9zdmc+')]">
                            <iframe id="previewFrame" class="w-full h-full absolute inset-0 border-none bg-transparent"></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        function widgetApp() {
            return {
                loading: true,
                isSaving: false,
                search: '',
                showModal: false,
                isEdit: false,
                codeTab: 'html', 
                widgets: [],
                form: { id: '', label: '', category: '1. Hero Banner', content: '', script: '', attributes: '' },

                async init() {
                    await this.fetchWidgets();
                    this.$watch('showModal', (val) => {
                        if (val) setTimeout(() => this.renderPreview(), 100); 
                    });
                },

                get filteredWidgets() {
                    if (!this.search) return this.widgets;
                    const q = this.search.toLowerCase();
                    return this.widgets.filter(w => w.label.toLowerCase().includes(q) || w.category.toLowerCase().includes(q) || w.id.toLowerCase().includes(q));
                },

                async fetchWidgets() {
                    this.loading = true;
                    try {
                        const res = await fetch('/api/admin/v1/widgets');
                        if (res.ok) this.widgets = await res.json();
                    } catch (e) { console.error('Gagal fetch:', e); }
                    this.loading = false;
                },

                renderPreview() {
                    const frame = document.getElementById('previewFrame');
                    if (!frame) return;
                    const doc = frame.contentWindow.document;
                    const htmlCode = this.form.content || '<div class="flex items-center justify-center h-full text-slate-400">Mulai ketik elemen HTML...</div>';
                    
                    let scriptInjection = '';
                    if (this.form.script && this.form.script.trim() !== '') {
                        scriptInjection = \`<script>document.addEventListener("DOMContentLoaded", function() { try { const el = document.body.firstElementChild; if(el) { (function() { \${this.form.script} }).call(el); } } catch(e) { console.error("Widget Script Error:", e); } });<\\/script>\`;
                    }

                    const fullHTML = \`<!DOCTYPE html><html><head><meta charset="UTF-8"><script src="https://cdn.tailwindcss.com"><\\/script><script src="https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js"><\\/script><style>body { padding: 20px; font-family: system-ui; }</style></head><body>\${htmlCode}\${scriptInjection}</body></html>\`;

                    doc.open();
                    doc.write(fullHTML);
                    doc.close();
                },

                openModal(widget = null) {
                    this.codeTab = 'html';
                    if (widget) {
                        this.isEdit = true;
                        this.form = JSON.parse(JSON.stringify(widget));
                        if (typeof this.form.attributes === 'object') {
                            this.form.attributes = JSON.stringify(this.form.attributes, null, 2);
                        }
                    } else {
                        this.isEdit = false;
                        this.form = { 
                            id: 'widget-' + Date.now(), 
                            label: '', category: '1. Hero Banner', 
                            content: '<div class="p-8 bg-indigo-600 text-white rounded-2xl text-center">\\n  <h2 class="text-2xl font-bold">Judul Banner</h2>\\n</div>', 
                            script: '', 
                            attributes: '{\\n  "traits": []\\n}' 
                        };
                    }
                    this.showModal = true;
                },

                async saveWidget() {
                    if (!this.form.id || !this.form.content) return Swal.fire('Peringatan', 'ID dan Struktur HTML wajib diisi!', 'warning');
                    
                    try {
                        if (this.form.attributes && this.form.attributes.trim() !== '') {
                            JSON.parse(this.form.attributes); 
                        } else {
                            this.form.attributes = '{}'; 
                        }
                    } catch(e) {
                        return Swal.fire('Format Error', 'Kode di tab Pengaturan (JSON) tidak valid. Harus format JSON murni.', 'error');
                    }

                    this.isSaving = true;
                    try {
                        const res = await fetch('/api/admin/v1/widgets', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(this.form)
                        });
                        if (res.ok) {
                            this.showModal = false;
                            await this.fetchWidgets();
                            Swal.fire({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, icon: 'success', title: 'Widget berhasil disimpan' });
                        } else throw new Error('Server menolak permintaan');
                    } catch (e) { Swal.fire('Error', e.message, 'error'); }
                    this.isSaving = false;
                },

                async deleteWidget(id) {
                    const result = await Swal.fire({ title: 'Hapus Widget?', text: "Data tidak bisa dikembalikan.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Ya, Hapus!' });
                    if (result.isConfirmed) {
                        try {
                            await fetch(\`/api/admin/v1/widgets/\${id}\`, { method: 'DELETE' });
                            await this.fetchWidgets();
                        } catch (e) { Swal.fire('Error', 'Gagal menghapus', 'error'); }
                    }
                }
            }
        }
    </script>
  `

  // Render menggunakan layout bawaan Admin HonoX Anda
  return c.render(
    <div dangerouslySetInnerHTML={{ __html: htmlContent }} />,
    { title: 'Manajemen Widget' }
  )
})
