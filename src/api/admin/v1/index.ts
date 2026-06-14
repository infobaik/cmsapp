import { Hono } from 'hono'

const app = new Hono()

app.post('/settings/update', async (c) => {
  // Parsing data dari form admin
  const body = await c.req.parseBody()
  
  const siteConfig = {
    siteName: body.siteName,
    siteDescription: body.siteDescription,
    themeColor: body.themeColor
  }

  try {
    // Simpan JSON langsung ke Cloudflare KV
    await c.env.SITE_KV.put('site_settings', JSON.stringify(siteConfig))
    
    // Redirect kembali ke halaman pengaturan dengan parameter sukses
    return c.redirect('/admin/settings?success=true')
  } catch (error) {
    console.error("Gagal menyimpan ke KV:", error)
    return c.redirect('/admin/settings?error=failed')
  }
})

export default app
