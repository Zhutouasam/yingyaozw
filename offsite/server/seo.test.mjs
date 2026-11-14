import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { createWebsiteServer } from './index.mjs'

const paths = [
  '/services/amazon-offsite/', '/services/facebook-groups/',
  '/services/influencer-video/', '/services/pr-media/'
]

async function checkPublicPages(base) {
  for (const path of ['/', '/quote', ...paths]) {
      const response = await fetch(base + path)
      assert.equal(response.status, 200, path)
      const html = await response.text()
      assert.match(html, /深圳市荧耀科技有限公司/, path)
      assert.ok(html.includes(`rel="canonical" href="https://yingyaozw.com${path}"`), path)
      const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      assert.equal(schemas.length, 1, path)
      assert.ok(JSON.parse(schemas[0][1])['@graph'].some(item => item['@type'] === 'Organization'))
      const graph = JSON.parse(schemas[0][1])['@graph']
      assert.ok(graph.some(item => item['@type'] === 'WebPage' && item.url === `https://yingyaozw.com${path}`))
      assert.match(html, /rel="alternate" type="text\/markdown"/)
      if (path.startsWith('/services/')) {
        assert.ok(graph.some(item => item['@type'] === 'BreadcrumbList'))
        const faq = graph.find(item => item['@type'] === 'FAQPage')
        assert.ok(faq && html.includes(faq.mainEntity[0].acceptedAnswer.text))
        const markdown = await fetch(base + path + 'index.md')
        assert.equal(markdown.status, 200)
        assert.match(markdown.headers.get('content-type'), /text\/markdown/)
        assert.match(await markdown.text(), /深圳市荧耀科技有限公司/)

        assert.match(html, /询价|合作前/)
        const head = await fetch(base + path, { method: 'HEAD' })
        assert.equal(head.status, 200)
        assert.equal(await head.text(), '')
      }
    }
}

test('GEO 生产路由：原始正文、规范网址、引用数据和私有页面隔离', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'yingyao-seo-'))
  const website = createWebsiteServer({ dbPath: join(directory, 'pricing.sqlite') })
  website.server.listen(0, '127.0.0.1')
  await once(website.server, 'listening')
  const base = `http://127.0.0.1:${website.server.address().port}`
  try {
    await checkPublicPages(base)
    const llms = await (await fetch(base + '/llms.txt')).text()
    assert.match(llms, /深圳市荧耀科技有限公司/)
    for (const path of paths) assert.ok(llms.includes(`https://yingyaozw.com${path}index.md`))
    for (const path of ['/index.md', '/quote.md']) {
      const markdown = await fetch(base + path)
      assert.equal(markdown.status, 200)
      assert.match(await markdown.text(), /深圳市荧耀科技有限公司/)
    }
    const quote = await (await fetch(base + '/quote')).text()
    assert.match(quote, /费用|报价/)
    assert.match(quote, /src="\/assets\/index-/)
    const slash = await fetch(base + '/quote/', { redirect: 'manual' })
    assert.equal(slash.status, 308)
    assert.equal(slash.headers.get('location'), '/quote')
    const service = await fetch(base + paths[0].slice(0, -1) + '?from=test', { redirect: 'manual' })
    assert.equal(service.status, 308)
    assert.equal(service.headers.get('location'), paths[0] + '?from=test')
    const sitemap = await (await fetch(base + '/sitemap.xml')).text()
    for (const path of paths) assert.ok(sitemap.includes(`https://yingyaozw.com${path}`))
    assert.doesNotMatch(sitemap, /admin|\/api\/|\.sqlite/)
    assert.match((await fetch(base + '/admin')).headers.get('x-robots-tag'), /noindex/)
    assert.equal((await fetch(base + '/services/missing/', { headers: { Accept: 'text/html' } })).status, 404)
  } finally {
    const closed = once(website.server, 'close')
    website.server.close()
    await closed
    rmSync(directory, { recursive: true, force: true })
  }
})

test('GEO 元信息：拒绝非根域名，并安全转义结构化数据', async () => {
  const { resolveOrigin, decorateDocument } = await import('../shared/public-document.mjs')
  for (const value of ['https://example.com/path', 'https://user:secret@example.com', 'javascript:alert(1)']) {
    assert.throws(() => resolveOrigin(value))
  }
  const { servicePages } = await import('../shared/public-content.mjs')
  const page = { ...servicePages[0], title: '</script><script>alert(1)</script>' }
  const html = decorateDocument('<head><title>原文</title></head>', {
    origin: 'https://example.com', path: '/', title: 'A & B', description: '描述', page
  })
  assert.match(html, /<title>A &amp; B<\/title>/)
  const data = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]
  assert.equal(JSON.parse(data)['@graph'][2].name, page.title)
  assert.ok(!data.includes('<'))
})
