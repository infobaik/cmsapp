import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Mengambil semua kategori dari D1
  const query = `SELECT id, parent_id, name, type FROM categories ORDER BY type, name`
  const { results: categories } = await c.env.DB.prepare(query).all()

  // Memisahkan parent dan child untuk tampilan
  const parents = categories.filter((cat: any) => cat.parent_id === null)

  return c.render(
    <div class="admin-categories">
      <h1>Manajemen Kategori</h1>
      
      <div class="form-card">
        <h3>Tambah Kategori Baru</h3>
        <form method="POST" action="/api/admin/v1/categories/create">
          <input type="text" name="name" placeholder="Nama Kategori" required />
          <input type="text" name="slug" placeholder="Slug URL (opsional)" />
          <select name="type">
            <option value="product">Produk</option>
            <option value="blog">Blog</option>
          </select>
          <select name="parent_id">
            <option value="">-- Tidak Ada (Jadikan Parent) --</option>
            {parents.map((p: any) => (
              <option value={p.id}>{p.name} ({p.type})</option>
            ))}
          </select>
          <button type="submit" class="btn btn-primary">Simpan</button>
        </form>
      </div>

      <div class="list-card">
        <h3>Daftar Kategori Induk</h3>
        <ul>
          {parents.map((parent: any) => (
            <li>
              <strong>{parent.name}</strong> - Tipe: {parent.type}
              <ul>
                {categories
                  .filter((child: any) => child.parent_id === parent.id)
                  .map((child: any) => (
                    <li>↳ {child.name}</li>
                  ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    { title: 'Manajemen Kategori' }
  )
})
