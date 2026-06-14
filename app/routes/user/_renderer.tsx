import { jsxRenderer } from 'hono/jsx-renderer'

export default jsxRenderer(({ children }, c) => {
  const user = c.get('user')!
  const currentPath = c.req.path

  const isActive = (path: string) => currentPath.includes(path) ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'

  return (
    <div class="flex flex-col md:flex-row min-h-[calc(100vh-70px)] bg-[#121217] w-full border-t border-slate-800/50">
      
      {/* SIDEBAR NAVIGATION */}
      <aside class="hidden md:flex flex-col w-64 bg-[#18181b] border-r border-slate-800/60 py-6 shrink-0">
        <div class="px-6 mb-8">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Menu Utama</p>
          <nav class="space-y-1">
            <a href="/user/dashboard" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/dashboard')}`}>
              {/* KUNCI UKURAN SVG DISINI */}
              <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>
              <span class="font-medium text-sm">Dashboard</span>
            </a>
            <a href="/user/history" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/history')}`}>
              <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span class="font-medium text-sm">Riwayat Transaksi</span>
            </a>
            <a href="/user/wallet" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/wallet')}`}>
              <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 110-6h3.75A2.25 2.25 0 0021 5.25V12zM3 12a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 12v-1.5a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 12v1.5z" /></svg>
              <span class="font-medium text-sm">Dompet & Saldo</span>
            </a>
          </nav>
        </div>

        <div class="px-6 mt-auto">
          <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Lainnya</p>
          <nav class="space-y-1">
            <a href="/user/settings" class={`flex items-center gap-3 px-4 py-2.5 rounded-l-lg transition-colors ${isActive('/settings')}`}>
              <svg width="20" height="20" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span class="font-medium text-sm">Pengaturan</span>
            </a>
          </nav>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <div class="flex-1 flex flex-col w-full overflow-hidden relative">
        <main class="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>

    </div>
  )
})
