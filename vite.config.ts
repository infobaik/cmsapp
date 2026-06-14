import pages from '@hono/vite-cloudflare-pages'
import honox from 'honox/vite'
import client from 'honox/vite/client'
import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
  if (mode === 'client') {
    return {
      plugins: [client()],
      build: {
        rollupOptions: {
          // PERBAIKAN: Gunakan input, biarkan Vite yang mengatur output (dan hash-nya)
          input: ['./app/client.ts', './app/style.css'],
        }
      }
    }
  }
  return {
    plugins: [
      honox(),
      pages()
    ]
  }
})
