import {} from 'hono'

// Definisi tipe user dasar
type User = {
  id: number
  name: string
  email: string
  role: 'admin' | 'member'
}

declare module 'hono' {
  interface Env {
    Variables: {
      user: User | null // Context user untuk smart renderer
    }
    Bindings: {
      DB: D1Database    // Binding Cloudflare D1
      SITE_KV: KVNamespace // Binding Cloudflare KV
    }
  }
}
