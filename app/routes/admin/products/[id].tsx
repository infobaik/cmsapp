import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  const productId = c.req.param('id')
  
  // Ambil data produk spesifik
  const product = await c.env.DB.prepare(`SELECT * FROM products WHERE id = ?`).bind(productId).first()
  
  if (!product) {
    return c.html(<h1>Produk tidak ditemukan!</h1>, 404)
  }

  // Ambil data kategori untuk dropdown
  const { results: categories } = await c.env.DB.prepare(`SELECT id, name FROM categories WHERE type = 'product'`).all()

  return c.render(
    <div class="admin-product-edit">
      <h1>Edit Produk: {product.name}</h1>
      <form method="POST" action={`/api/admin/v1/products/${product.id}/update`}>
        <input type="text" name="name" value={product.name as string} required />
        <select name="category_id">
          {categories.map((cat: any) => (
            <option value={cat.id} selected={cat.id === product.category_id}>{cat.name}</option>
          ))}
        </select>
        <select name="stock_type">
          <option value="general" selected={product.stock_type === 'general'}>Produk Umum</option>
          <option value="unique" selected={product.stock_type === 'unique'}>Produk Unik (Sekali Order)</option>
        </select>
        <input type="number" name="price" value={product.price as number} required />
        <button type="submit" class="btn btn-primary">Update Data</button>
      </form>
    </div>,
    { title: `Edit Produk` }
  )
})
