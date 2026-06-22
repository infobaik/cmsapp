import { createRoute } from 'honox/factory'

export const GET = createRoute(async (c) => {
  try {
    const id = c.req.param('id')
    const strId = String(id)
    const intId = Number(id)

    // 1. Ambil Kategori Induk (Tanpa chaining berisiko)
    let category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(strId).first()
    if (!category) {
      category = await c.env.DB.prepare(`SELECT * FROM categories WHERE id = ?`).bind(intId).first()
    }

    if (!category) {
      return c.json({ success: false, message: 'Kategori tidak ditemukan' }, 404)
    }

    // 2. Ambil Sub-Kategori
    let subReqStr = await c.env.DB.prepare(`SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id = ? ORDER BY name ASC`).bind(strId).all()
    let subCategories = subReqStr.results || []
    
    if (subCategories.length === 0) {
      let subReqInt = await c.env.DB.prepare(`SELECT id, name, slug, image_url, cover_url FROM categories WHERE parent_id = ? ORDER BY name ASC`).bind(intId).all()
      subCategories = subReqInt.results || []
    }

    // 3. Ambil Produk (Hanya jika tidak ada sub-kategori)
    let products: any[] = []
    if (subCategories.length === 0) {
      const qStr = `SELECT p.*, pr.name as provider_name FROM products p JOIN providers pr ON p.provider_id = pr.id WHERE p.category_id = ? AND p.status = 'active' AND p.is_visible = 1 ORDER BY p.price ASC`
      
      let prodReqStr = await c.env.DB.prepare(qStr).bind(strId).all()
      products = prodReqStr.results || []
      
      if (products.length === 0) {
        let prodReqInt = await c.env.DB.prepare(qStr).bind(intId).all()
        products = prodReqInt.results || []
      }
    }

    return c.json({
      success: true,
      data: {
        category,
        sub_categories: subCategories,
        products
      }
    }, 200)

  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
})
