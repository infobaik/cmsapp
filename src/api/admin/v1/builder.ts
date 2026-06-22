// src/api/admin/v1/builder.ts
import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

// 1. Ambil semua widget untuk panel GrapesJS
app.get('/widgets', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM widgets ORDER BY category ASC`).all()
  return c.json(results.map(w => ({
    id: w.id,
    label: w.label,
    category: w.category,
    content: w.content,
    script: w.script,
    attributes: w.attributes ? JSON.parse(w.attributes as string) : {}
  })))
})

// 2. Simpan hasil desain Page Builder
app.post('/pages', async (c) => {
  const { slug, html, css } = await c.req.json()
  await c.env.DB.prepare(`
    INSERT INTO pages (slug, html_content, css_content) 
    VALUES (?, ?, ?) 
    ON CONFLICT(slug) DO UPDATE SET html_content=excluded.html_content, css_content=excluded.css_content
  `).bind(slug, html, css).run()
  return c.json({ success: true })
})

// 3. Ambil data desain untuk diedit / ditampilkan
app.get('/pages/:slug', async (c) => {
  const page = await c.env.DB.prepare(`SELECT html_content, css_content FROM pages WHERE slug = ?`).bind(c.req.param('slug')).first()
  return c.json(page || { html_content: '', css_content: '' })
})

export default app
