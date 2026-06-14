import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, Script } from 'honox/server'

export default jsxRenderer(({ children, title }, c) => {
  const user = c.get('user')!
  const currentPath = c.req.path

  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(path + '/')
      ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500'
      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'

  return (
    <html lang="id">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title ? `${title} | Admin Panel` : 'Admin Panel'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <Link href="/app/style.css" rel="stylesheet" />
        <Script src="/app/client.ts" async />
      </head>

      <body class="font-sans antialiased bg-[#121217] text-slate-100 h-screen overflow-hidden flex relative">
        
        {/* OVERLAY GELAP UNTUK MOBILE (Akan muncul saat menu dibuka) */}
        <div id="mobile-overlay" class="fixed inset-0 bg-black/60 z-40 hidden md:hidden backdrop-blur-sm transition-opacity"></div>

        {/* SIDEBAR ADMIN (Dirombak agar Slide-in di Mobile) */}
        <aside id="sidebar" class="fixed inset-y-0 left-0 z-50 w-64 bg-[#18181b] border-r border-slate-800/60 py-6 flex flex-col transform -translate-x-full transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 shadow-2xl md:shadow-none">
          <div class="px-6 mb-8 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/20">A</div>
              <span class="text-xl font-bold tracking-tight text-white">Admin Panel</span>
            </div>
            {/* Tombol Tutup Sidebar Khusus HP */}
            <button id="close-sidebar" class="md:hidden text-slate-400 hover:text-white p-1 rounded-md bg-slate-800/50">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div class="px-6 flex-1 overflow-y-auto no-scrollbar">
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Menu Utama</p>
            <nav class="space-y-1 mb-8">
              <a href="/admin" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${currentPath === '/admin' ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
                <span class="font-medium text-sm">Dashboard</span>
              </a>
              <a href="/admin/deposits" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/admin/deposits')}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span class="font-medium text-sm">Validasi Deposit</span>
              </a>
              <a href="/admin/members" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/admin/members')}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                <span class="font-medium text-sm">Data Member</span>
              </a>
            </nav>

            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Manajemen Produk</p>
            <nav class="space-y-1 mb-8">
              <a href="/admin/products" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/admin/products')}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
                <span class="font-medium text-sm">Katalog Produk</span>
              </a>
              <a href="/admin/categories" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/admin/categories')}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path stroke-linecap="round" stroke-linejoin="round" d="M6 6h.008v.008H6V6z" /></svg>
                <span class="font-medium text-sm">Kategori & Label</span>
              </a>
              <a href="/admin/providers" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/admin/providers')}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
                <span class="font-medium text-sm">Provider H2H</span>
              </a>
            </nav>
            
            <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">Sistem</p>
            <nav class="space-y-1 pb-6">
              <a href="/admin/settings" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/admin/settings')}`}>
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span class="font-medium text-sm">Pengaturan Web</span>
              </a>
              <a href="/api/user/v1/logout" class="flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors text-red-400 hover:bg-red-500/10 mt-4">
                <svg width="18" height="18" class="shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
                <span class="font-medium text-sm">Keluar (Logout)</span>
              </a>
            </nav>
          </div>
        </aside>

        {/* CONTENT WRAPPER */}
        <div class="flex-1 flex flex-col min-w-0 bg-[#121217]">
          <header class="h-20 flex items-center justify-between px-4 md:px-10 border-b border-slate-800/60 shrink-0 bg-[#18181b]/50 backdrop-blur-md">
            <div class="flex items-center gap-4">
              {/* TOMBOL HAMBURGER MOBILE */}
              <button id="open-sidebar" class="md:hidden text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h1 class="text-xl font-bold text-slate-100 tracking-tight hidden sm:block">{title || 'Admin Panel'}</h1>
            </div>
            <div class="flex items-center gap-4">
              <span class="text-sm font-semibold text-slate-300">Hi, {user.name}</span>
              <div class="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-blue-500/20">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
          </header>

          <main class="flex-1 overflow-y-auto p-4 md:p-10">
            {children}
          </main>
        </div>

        {/* LOGIKA JS UNTUK TOGGLE MENU MOBILE */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', () => {
            const openBtn = document.getElementById('open-sidebar');
            const closeBtn = document.getElementById('close-sidebar');
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('mobile-overlay');

            function toggleMenu() {
              sidebar.classList.toggle('-translate-x-full');
              overlay.classList.toggle('hidden');
            }

            openBtn.addEventListener('click', toggleMenu);
            closeBtn.addEventListener('click', toggleMenu);
            overlay.addEventListener('click', toggleMenu);
          });
        `}} />
      </body>
    </html>
  )
})
