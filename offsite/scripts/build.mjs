import { buildPublicPages } from './build-public-pages.mjs'
import { build } from 'vite'
import react from '@vitejs/plugin-react'
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname, '..')
await build({ root, build: { manifest: true } })
const temporary = await mkdtemp(resolve(root, '.home-render-'))
try {
  await build({ root, configFile: false, plugins: [react()], ssr: { noExternal: true }, build: { ssr: 'src/home-render.jsx', outDir: temporary, emptyOutDir: true, rollupOptions: { output: { entryFileNames: 'render.mjs' } } } })
  const { renderHome } = await import(pathToFileURL(resolve(temporary, 'render.mjs')))
  const manifest = JSON.parse(await readFile(resolve(root, 'dist/.vite/manifest.json'), 'utf8'))
  const keys = new Set(), files = new Set(), styles = new Set()
  const visit = key => {
    if (keys.has(key)) return
    keys.add(key)
    const chunk = manifest[key]
    if (!chunk) return
    for (const dependency of chunk.imports || []) visit(dependency)
    files.add(chunk.file)
    for (const css of chunk.css || []) styles.add(css)
  }
  visit('src/home-entry.jsx')
  const critical = [...styles].map(file => `<link rel="stylesheet" href="/${file}">`).join('\n') + '\n' + [...files].map(file => `<link rel="modulepreload" href="/${file}">`).join('\n')
  let html = await readFile(resolve(root, 'dist/index.html'), 'utf8')
  html = html.replace('<div id="root"></div>', `<div id="root">${renderHome()}</div>`).replace('</head>', `${critical}\n</head>`)
  await writeFile(resolve(root, 'dist/home.html'), html)
  console.log('Homepage prerendered: dist/home.html')
} finally { await rm(temporary, { recursive: true, force: true }) }

await buildPublicPages(root)
