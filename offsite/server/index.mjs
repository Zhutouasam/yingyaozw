import { servicePages, servicePath } from '../shared/public-content.mjs'
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { createApi } from './api.mjs'
import { projectRoot } from './store.mjs'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream'

export function createWebsiteServer(options = {}) {
  const api = createApi(options)
  const assets = resolve(projectRoot, 'dist')
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8'
  }
  const server = createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    if (req.url.startsWith('/api/') || req.url.startsWith('/data/')) return api.handler(req, res)
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405)
      res.end()
      return
    }
    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      res.writeHead(400)
      res.end()
      return
    }
    if (pathname.startsWith('/data/')) {
      res.writeHead(404)
      res.end('Not found')
      return
    }
    const service = servicePages.find(page => [servicePath(page), servicePath(page).slice(0, -1)].includes(pathname))
    const canonicalPath = pathname === '/quote/' ? '/quote' : service ? servicePath(service) : pathname
    if (canonicalPath !== pathname) {
      res.writeHead(308, { Location: canonicalPath + new URL(req.url, 'http://localhost').search })
      res.end()
      return
    }
    let file = service
      ? resolve(assets, `services/${service.slug}/index.html`)
      : pathname === '/quote' && existsSync(resolve(assets, 'quote.html'))
        ? resolve(assets, 'quote.html')
        :
      pathname === '/' && existsSync(resolve(assets, 'home.html'))
        ? resolve(assets, 'home.html')
        : ['/', '/quote', '/quote/', '/admin', '/admin/'].includes(pathname)
          ? resolve(assets, 'index.html')
          : resolve(assets, `.${pathname}`)
    if (!file.startsWith(assets + sep) || !existsSync(file) || !statSync(file).isFile()) {
      if (
        !extname(pathname) &&
        req.headers.accept?.includes('text/html') &&
        existsSync(resolve(assets, 'index.html'))
      ) {
        file = resolve(assets, 'index.html')
        res.statusCode = 404
      } else {
        res.writeHead(404)
        res.end('Not found')
        return
      }
    }
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream')
    res.setHeader(
      'Cache-Control',
      /\/assets\/[^/]+-[a-zA-Z0-9_-]{8,}\.(js|css)$/.test(file)
        ? 'public, max-age=31536000, immutable'
        : 'no-cache'
    )
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    )
    if (pathname.startsWith('/admin')) res.setHeader('X-Robots-Tag', 'noindex, nofollow')
    const gzip =
      ['.html', '.js', '.css', '.json', '.svg'].includes(extname(file)) &&
      req.headers['accept-encoding']
        ?.split(',')
        .some((value) => /^gzip(?:\s*;\s*q=(?!0(?:\.0*)?$)[\d.]+)?\s*$/.test(value.trim()))
    res.setHeader('Vary', 'Accept-Encoding')
    if (gzip) res.setHeader('Content-Encoding', 'gzip')
    if (req.method === 'HEAD') res.end()
    else {
      const streams = [createReadStream(file), ...(gzip ? [createGzip()] : []), res]
      pipeline(...streams, (error) => {
        if (error && !res.destroyed) res.destroy()
      })
    }
  })
  server.on('close', () => api.close())
  return { server, api }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  if (!existsSync(resolve(projectRoot, 'dist/index.html'))) throw new Error('请先运行 npm run build')
  const { server } = createWebsiteServer()
  const port = Number(process.env.PORT || 4173),
    host = process.env.HOST || '127.0.0.1'
  server.listen(port, host, () =>
    console.log(`荧耀站外: http://${host}:${port}\n管理后台: http://${host}:${port}/admin`)
  )
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)))
}
