import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Mengambil metrik penting dari database D1
  const membersCount = await c.env.DB.prepare(`SELECT count(id) as total FROM users WHERE role = 'member'`).first()
  const pendingDeposits = await c.env.DB.prepare(`SELECT count(id) as total FROM deposits WHERE status = 'pending'`).first()
  const productsCount = await c.env.DB.prepare(`SELECT count(id) as total FROM products WHERE status = 'active'`).first()

  return c.render(
    <div class="max-w-7xl mx-auto space-y-6">
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 flex items-center justify-between group">
          <div>
            <p class="text-sm font-medium text-slate-400 mb-1">Total Member</p>
            <h3 class="text-3xl font-bold text-slate-100">{membersCount?.total || 0}</h3>
          </div>
          <div class="w-14 h-14 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          </div>
        </div>

        {/* Metric 2 */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 flex items-center justify-between group">
          <div>
            <p class="text-sm font-medium text-slate-400 mb-1">Deposit Tertunda</p>
            <h3 class="text-3xl font-bold text-amber-400">{pendingDeposits?.total || 0}</h3>
          </div>
          <div class="w-14 h-14 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </div>
        </div>

        {/* Metric 3 */}
        <div class="bg-[#18181b] border border-slate-800/60 rounded-2xl p-6 flex items-center justify-between group">
          <div>
            <p class="text-sm font-medium text-slate-400 mb-1">Produk Aktif</p>
            <h3 class="text-3xl font-bold text-slate-100">{productsCount?.total || 0}</h3>
          </div>
          <div class="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          </div>
        </div>
      </div>

    </div>,
    { title: 'Dashboard Utama' }
  )
})
