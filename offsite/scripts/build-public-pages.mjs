import { readBuyerQa } from './read-buyer-qa.mjs'
import { buildMachineContent } from './build-machine-content.mjs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { homeTitle, homeDescription, servicePages, servicePath } from '../shared/public-content.mjs'
import { decorateDocument, publicPageBody, resolveOrigin, escapeHtml, buyerQaBody } from '../shared/public-document.mjs'

export async function buildPublicPages(root) {
  const origin = resolveOrigin(process.env.PUBLIC_ORIGIN)
  const dist = resolve(root, 'dist')
  const base = await readFile(resolve(dist, 'index.html'), 'utf8')
  const homepage = await readFile(resolve(dist, 'home.html'), 'utf8')
  await writeFile(resolve(dist, 'home.html'), decorateDocument(homepage, {
    origin, path: '/', title: homeTitle, description: homeDescription
  }))
  const quote = base.replace('<div id="root"></div>', `<div id="root">${publicPageBody()}</div>`)
    .replace('</head>', '<link rel="stylesheet" href="/service-pages.css">\n</head>')
  await writeFile(resolve(dist, 'quote.html'), decorateDocument(quote, {
    origin, path: '/quote', title: '荧耀站外｜跨境电商推广渠道与报价',
    description: '了解海外群组、Deal网站、红人视频与PR媒体的渠道分类、报价影响因素及合作要求，具体价格与排期以执行前确认为准。'
  }))
  for (const page of servicePages) {
    const directory = resolve(dist, `services/${page.slug}`)
    await mkdir(directory, { recursive: true })
    const html = base.replace(/^[ \t]*<script type="module"[^>]*><\/script>[ \t]*\r?\n/gm, '')
      .replace('<div id="root"></div>', `<div id="root">${publicPageBody(page)}</div>`)
      .replace('</head>', '<link rel="stylesheet" href="/service-pages.css">\n</head>')
    await writeFile(resolve(directory, 'index.html'), decorateDocument(html, {
      origin, path: servicePath(page), title: `${page.title}｜荧耀站外`, description: page.description, page
    }))
  }
  const buyerQa = readBuyerQa()
  await mkdir(resolve(dist, 'buyer-qa'), { recursive: true })
  const faqHtml = base.replace(/^[ \t]*<script type="module"[^>]*><\/script>[ \t]*\r?\n/gm, '')
    .replace('<div id="root"></div>', `<div id="root">${buyerQaBody(buyerQa)}</div>`)
    .replace('</head>', '<link rel="stylesheet" href="/service-pages.css">\n</head>')
  await writeFile(resolve(dist, 'buyer-qa/index.html'), decorateDocument(faqHtml, {
    origin, path: '/buyer-qa/', title: '站外推广买家问答｜荧耀站外',
    description: '24 个买家常见问题，涵盖亚马逊站外推广、Facebook群组与Deal网站、红人视频及PR媒体的选型、费用、准备资料和交付验收。',
    faqs: buyerQa.map(entry => [entry.question, entry.answer])
  }))
  await buildMachineContent(dist, origin, buyerQa)
  const paths = ['/', '/quote', '/buyer-qa/', ...servicePages.map(servicePath)]
  const urls = paths.map(path => `  <url><loc>${escapeHtml(origin + path)}</loc></url>`).join('\n')
  await writeFile(resolve(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`)
  const robots = (await readFile(resolve(dist, 'robots.txt'), 'utf8')).replace(/^Sitemap:.*\n?/gmi, '')
  await writeFile(resolve(dist, 'robots.txt'), `${robots.trim()}\nSitemap: ${origin}/sitemap.xml\n`)
  console.log('Public pages generated: homepage, quote, four services and sitemap')
}
