import { createRoute } from 'honox/factory'

export default createRoute(async (c) => {
  // Ambil daftar artikel
  const query = `SELECT id, title, slug, published_at FROM posts ORDER BY published_at DESC`
  const { results: posts } = await c.env.DB.prepare(query).all()

  return c.render(
    <div class="admin-blog">
      <h1>Manajemen Blog</h1>
      <a href="/admin/blog/new" class="btn btn-primary">+ Tulis Artikel Baru</a>
      
      <ul class="blog-list">
        {posts.map((post: any) => (
          <li class="blog-item">
            <h3>{post.title}</h3>
            <p>Slug: /{post.slug}</p>
            <p>Dipublikasi: {new Date(post.published_at).toLocaleDateString('id-ID')}</p>
            <a href={`/admin/blog/${post.id}`} class="btn btn-small btn-outline">Edit</a>
          </li>
        ))}
      </ul>
    </div>,
    { title: 'Manajemen Blog' }
  )
})
