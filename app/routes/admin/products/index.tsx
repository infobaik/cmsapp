import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Join dengan tabel categories untuk menampilkan nama kategori
  const query = `
    SELECT p.id, p.name, p.stock_type, p.price, p.status, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.id DESC
  `
  const { results: products } = await c.env.DB.prepare(query).all()

  return c.render(
    <div class="admin-products">
      <div class="header-action">
        <h1>Katalog Produk</h1>
        <a href="/admin/products/new" class="btn btn-primary">+ Tambah Produk</a>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nama Produk</th>
            <th>Kategori</th>
            <th>Tipe Stok</th>
            <th>Harga</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p: any) => (
            <tr>
              <td>{p.id}</td>
              <td>{p.name}</td>
              <td>{p.category_name || '-'}</td>
              <td>{p.stock_type === 'unique' ? 'Sekali Pakai (Unik)' : 'Berkali-kali (Umum)'}</td>
              <td>Rp {p.price.toLocaleString('id-ID')}</td>
              <td>{p.status}</td>
              <td>
                <a href={`/admin/products/${p.id}`} class="btn btn-small">Edit</a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>,
    { title: 'Katalog Produk' }
  )
})
