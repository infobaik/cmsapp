import { Hono } from 'hono'

const app = new Hono<{ Bindings: Env }>()

// 1. AMBIL SEMUA WIDGET (GET)
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM widgets ORDER BY created_at DESC`).all()
  return c.json(results)
})

// 2. SIMPAN / UPDATE WIDGET (POST)
app.post('/', async (c) => {
  const { id, label, category, content, script, attributes } = await c.req.json()
  
  // Format attributes jadi string JSON jika masih berupa object
  const attrString = typeof attributes === 'object' ? JSON.stringify(attributes) : attributes

  await c.env.DB.prepare(`
    INSERT INTO widgets (id, label, category, content, script, attributes) 
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET 
      label=excluded.label, 
      category=excluded.category, 
      content=excluded.content, 
      script=excluded.script, 
      attributes=excluded.attributes
  `).bind(id, label, category, content, script, attrString).run()
  
  return c.json({ success: true })
})

// 3. HAPUS WIDGET (DELETE)
app.delete('/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`DELETE FROM widgets WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

export default app
