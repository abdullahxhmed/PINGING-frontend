import fs from 'fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'save-sticker-plugin',
      configureServer(server) {
        server.middlewares.use('/api-internal/save-sticker', (req, res) => {
          let body = ''
          req.on('data', chunk => body += chunk)
          req.on('end', () => {
            try {
              const { pngData } = JSON.parse(body)
              const base64 = pngData.replace(/^data:image\/png;base64,/, '')
              const buf = Buffer.from(base64, 'base64')
              fs.writeFileSync('public/pingin-sticker.png', buf)
              fs.writeFileSync('pingin-sticker.png', buf)
              const brainPath = 'C:\\Users\\abdullah\\.gemini\\antigravity-ide\\brain\\299f7fdd-e0da-4663-a33f-b82c5d860293\\pingin-sticker.png'
              try { fs.writeFileSync(brainPath, buf) } catch {}
              res.statusCode = 200
              res.end('OK')
            } catch (err: any) {
              res.statusCode = 500
              res.end(err.message)
            }
          })
        })
      },
    },
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
