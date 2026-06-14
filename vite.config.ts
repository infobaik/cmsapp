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
          output: {
            entryFileNames: 'static/client.js',
            chunkFileNames: 'static/[name].js',
            assetFileNames: 'static/[name].[ext]'
          }
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
