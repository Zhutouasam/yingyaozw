import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createApi } from './server/api.mjs'
import { createReadStream, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const mountApi = server => {
  const api = createApi()
  server.middlewares.use(api.handler)
  server.httpServer?.once('close', () => api.close())
}
export default defineConfig({ plugins: [react(), { name: 'yingyao-pricing-api', configureServer: mountApi, configurePreviewServer(server) {
  mountApi(server)
  const homepage = resolve(server.config.root, server.config.build.outDir, 'home.html')
  server.middlewares.use((req, res, next) => {
    if (new URL(req.url, 'http://localhost').pathname !== '/' || !existsSync(homepage) || !['GET', 'HEAD'].includes(req.method)) return next()
    res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.setHeader('Cache-Control', 'no-cache')
    if (req.method === 'HEAD') res.end(); else createReadStream(homepage).pipe(res)
  })
} }] })
