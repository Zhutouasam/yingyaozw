import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { randomUUID } from 'node:crypto'
import { createWebsiteServer } from './index.mjs'

test('需求限流：默认忽略转发头，本机可信代理可区分真实访客', async () => {
  for (const trustLocalProxy of [false, true]) {
    const website = createWebsiteServer({ dbPath: ':memory:', trustLocalProxy })
    website.server.listen(0, '127.0.0.1'); await once(website.server, 'listening')
    const base = `http://127.0.0.1:${website.server.address().port}`
    const submit = ip => fetch(base + '/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: base, 'X-Forwarded-For': `198.51.100.9, ${ip}` }, body: JSON.stringify({ requestKey: randomUUID(), name: '代理测试', contact: 'test@example.com', category: '测试', consent: true }) })
    try {
      for (let index = 0; index < 5; index++) assert.equal((await submit('192.0.2.1')).status, 201)
      assert.equal((await submit('192.0.2.1')).status, 429)
      assert.equal((await submit('192.0.2.2')).status, trustLocalProxy ? 201 : 429)
    } finally { const closed = once(website.server, 'close'); website.server.close(); await closed }
  }
})

test('首页：摘要、需求提交、隐私权限、案例设置与持久化', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'yingyao-home-test-'))
  const dbPath = join(directory, 'pricing.sqlite')
  let website, base, cookie = '', csrf = ''
  const start = async () => {
    website = createWebsiteServer({ dbPath }); website.server.listen(0, '127.0.0.1'); await once(website.server, 'listening')
    base = `http://127.0.0.1:${website.server.address().port}`
  }
  const stop = async () => { const closed = once(website.server, 'close'); website.server.close(); await closed }
  const request = async (path, body, authorized = false, method = 'POST', headers = {}) => {
    const response = await fetch(base + path, { method: body ? method : 'GET', headers: { 'Content-Type': 'application/json', Origin: base, ...(authorized ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: await response.json(), headers: response.headers }
  }
  const demand = { requestKey: randomUUID(), name: '测试客户', contact: 'qa@example.com', category: '家居', productUrl: 'https://example.com/product', market: '美国', goal: '积累订单', budget: '待沟通', notes: '只用于独立测试数据库', consent: true }
  let inquiry
  try {
    await start()
    await t.test('轻量摘要与完整报价一致，不返回报价正文或私密需求', async () => {
      const summary = (await request('/api/home')).body, catalog = (await request('/api/catalog')).body
      assert.equal(summary.total, 612); assert.equal(summary.categoryMeta.length, 15); assert.equal(summary.groups.length, 4)
      for (const category of summary.categoryMeta) assert.equal(category.count, catalog.categories[category.id].length)
      assert.equal(summary.categories, undefined); assert.equal(summary.case, null); assert.deepEqual(summary.contact, { email: '', wechat: '', wechatQr: '' })
      assert.ok(Buffer.byteLength(JSON.stringify(summary)) < 10000)
    })
    await t.test('验证联系方式与品类、防跨站、去重提交、服务端解析意向渠道', async () => {
      assert.equal((await request('/api/inquiries', { ...demand, contact: '' })).status, 400)
      assert.equal((await request('/api/inquiries', { ...demand, consent: false })).status, 400)
      assert.equal((await request('/api/inquiries', { ...demand, productUrl: 'javascript:alert(1)' })).status, 400)
      assert.equal((await request('/api/inquiries', demand, false, 'POST', { Origin: 'https://other.example' })).status, 403)
      const catalog = (await request('/api/catalog')).body, first = catalog.categories.us[0]
      demand.selectionIds = [`us:${first.id}`, 'us:missing']
      const firstResponse = await request('/api/inquiries', demand)
      assert.equal(firstResponse.status, 201); inquiry = firstResponse.body
      assert.deepEqual(Object.keys(inquiry), ['id'])
      assert.deepEqual((await request('/api/inquiries', demand)).body, inquiry)
      assert.equal((await request('/api/inquiries', { ...demand, name: '其他客户' })).status, 409)
      assert.equal((await request('/api/admin/inquiries')).status, 401)
      const setup = await request('/api/auth/setup', { username: 'homeadmin', password: 'temporary-home-test-2026' })
      cookie = setup.headers.get('set-cookie').split(';')[0]; csrf = setup.body.user.csrfToken
      const received = (await request('/api/admin/inquiries', null, true)).body.items
      assert.equal(received.length, 1); assert.equal(received[0].contact, demand.contact)
      assert.deepEqual(received[0].selections, [{ name: first.name, category: 'us', price: first.price, currency: first.currency }])
      assert.equal(received[0].request_key, undefined)
      assert.equal((await request(`/api/admin/inquiries/${inquiry.id}`, { status: 'contacted', version: 1 }, true, 'PATCH', { 'X-CSRF-Token': '' })).status, 403)
      assert.equal((await request(`/api/admin/inquiries/${inquiry.id}`, { status: 'contacted', version: 1 }, true, 'PATCH')).status, 200)
      assert.equal((await request(`/api/admin/inquiries/${inquiry.id}`, { status: 'closed', version: 1 }, true, 'PATCH')).status, 409)
    })
    await t.test('案例须具备完整口径，联系方式可维护；摘要随目录隐藏更新', async () => {
      assert.equal((await request('/api/admin/site')).status, 401)
      let settings = (await request('/api/admin/site', null, true)).body
      assert.equal((await request('/api/admin/site', { ...settings, casePublished: true }, true, 'PATCH')).status, 400)
      const edited = await request('/api/admin/site', { ...settings, email: 'test@example.com', wechat: 'test-wechat', caseMetric: '销量', casePeriod: '测试周期', caseCategory: '测试品类', caseSource: '仅用于自动测试，非真实品牌案例', casePublished: true }, true, 'PATCH')
      assert.equal(edited.status, 200)
      assert.equal((await request('/api/admin/site', settings, true, 'PATCH')).status, 409)
      const summary = (await request('/api/home')).body
      assert.equal(summary.contact.email, 'test@example.com'); assert.equal(summary.case.growth, '156'); assert.equal(summary.case.metric, '销量')
      const category = (await request('/api/admin/catalog', null, true)).body.categoryMeta.find(row => row.id === 'us')
      await request('/api/admin/categories/us', { ...category, is_visible: false }, true, 'PATCH')
      const hidden = (await request('/api/home')).body
      assert.ok(!hidden.categoryMeta.some(row => row.id === 'us')); assert.equal(hidden.total, (await request('/api/catalog')).body.total)
      await stop(); await start()
      assert.equal((await request('/api/home')).body.case.metric, '销量')
      assert.equal((await request('/api/admin/inquiries', null, true)).body.items[0].status, 'contacted')
    })
    await t.test('微信二维码：认证、格式、体积、轻量公开摘要、持久化与移除', async () => {
      const qr = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEhkAAAAASUVORK5CYII='
      let settings = (await request('/api/admin/site', null, true)).body
      assert.equal((await fetch(base + '/api/wechat-qr')).status, 404)
      assert.equal((await request('/api/admin/site', { ...settings, wechatQr: qr }, false, 'PATCH')).status, 401)
      for (const wechatQr of ['data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,aGVsbG8=', 'https://example.com/qr.png', `data:image/png;base64,${Buffer.alloc(512 * 1024 + 1).toString('base64')}`]) {
        assert.equal((await request('/api/admin/site', { ...settings, wechatQr }, true, 'PATCH')).status, 400)
      }
      const edited = await request('/api/admin/site', { ...settings, wechatQr: qr }, true, 'PATCH')
      assert.equal(edited.status, 200)
      const summary = (await request('/api/home')).body
      assert.match(summary.contact.wechatQr, /^\/api\/wechat-qr\?v=\d+$/)
      assert.ok(Buffer.byteLength(JSON.stringify(summary)) < 10000)
      const image = await fetch(base + summary.contact.wechatQr)
      assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/png')
      assert.deepEqual(Buffer.from(await image.arrayBuffer()), Buffer.from(qr.split(',')[1], 'base64'))
      await stop(); await start()
      settings = (await request('/api/admin/site', null, true)).body
      assert.equal(settings.wechatQr, qr)
      // Older clients omitting the new field must preserve the configured image.
      const { wechatQr, ...oldClient } = settings
      assert.equal((await request('/api/admin/site', oldClient, true, 'PATCH')).body.wechatQr, qr)
      settings = (await request('/api/admin/site', null, true)).body
      assert.equal((await request('/api/admin/site', { ...settings, wechatQr: '' }, true, 'PATCH')).status, 200)
      assert.equal((await request('/api/home')).body.contact.wechatQr, '')
      assert.equal((await fetch(base + summary.contact.wechatQr)).status, 404)
    })
    await t.test('案例图片：草稿隐私、发布口径、顺序、替换、冲突与持久化；首页修改不刷新报价时间', async () => {
      const image = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aEhkAAAAASUVORK5CYII='
      const draft = { title: '仅用于测试的截图', category: '', desc: '', is_visible: false, sort_order: 2, image }
      const before = (await request('/api/catalog')).body.syncedAt
      assert.equal((await request('/api/admin/cases')).status, 401)
      assert.equal((await request('/api/admin/cases', draft)).status, 401)
      assert.equal((await request('/api/admin/cases', { ...draft, image: 'data:image/svg+xml;base64,PHN2Zy8+' }, true)).status, 400)
      assert.equal((await request('/api/admin/cases', draft, true, 'POST', { 'X-CSRF-Token': '' })).status, 403)
      let item = (await request('/api/admin/cases', draft, true)).body.item
      assert.ok(item.id); assert.equal((await request('/api/home')).body.caseImages.length, 0)
      assert.equal((await fetch(base + item.image)).status, 404)
      assert.equal((await fetch(base + item.image, { headers: { Cookie: cookie } })).status, 200)
      assert.equal((await request(`/api/admin/cases/${item.id}`, { ...item, is_visible: true, image: undefined }, true, 'PATCH')).status, 400)
      const previous = item
      item = (await request(`/api/admin/cases/${item.id}`, { ...item, category: '测试品类', desc: '测试合作内容，非真实案例', is_visible: true, image: undefined }, true, 'PATCH')).body.item
      assert.equal((await request(`/api/admin/cases/${item.id}`, { ...previous, image: undefined }, true, 'PATCH')).status, 409)
      let summary = (await request('/api/home')).body
      assert.equal(summary.caseImages.length, 1); assert.equal(summary.caseImages[0].desc, '测试合作内容，非真实案例')
      assert.ok(!JSON.stringify(summary).includes('base64'))
      assert.equal((await fetch(base + item.image)).headers.get('content-type'), 'image/png')
      const second = (await request('/api/admin/cases', { ...draft, title: '另一测试截图', category: '测试品类', desc: '仅用于测试', is_visible: true, sort_order: 1 }, true)).body.item
      assert.deepEqual((await request('/api/home')).body.caseImages.map(row => row.id), [second.id, item.id])
      await stop(); await start()
      assert.equal((await request('/api/admin/cases', null, true)).body.items.length, 2)
      item = (await request(`/api/admin/cases/${item.id}`, { ...item, image, is_visible: false }, true, 'PATCH')).body.item
      assert.equal((await fetch(base + item.image)).status, 404)
      assert.equal((await request('/api/home')).body.caseImages.length, 1)
      const settings = (await request('/api/admin/site', null, true)).body
      await request('/api/admin/site', { ...settings, wechat: 'another-test-wechat' }, true, 'PATCH')
      assert.equal((await request('/api/catalog')).body.syncedAt, before)
      const record = (await request('/api/admin/catalog', null, true)).body.records[0]
      await request(`/api/admin/records/${encodeURIComponent(record.entryId)}`, { ...record, price: '999' }, true, 'PATCH')
      const catalog = (await request('/api/catalog')).body
      assert.notEqual(catalog.syncedAt, before)
      assert.ok(Object.values(catalog.categories).flat().some(row => row.quotationUpdatedAt))
    })
    await t.test('限制重复来源提交，重试相同需求不占新额度', async () => {
      for (let count = 0; count < 4; count++) assert.equal((await request('/api/inquiries', { ...demand, requestKey: randomUUID() })).status, 201)
      assert.equal((await request('/api/inquiries', { ...demand, requestKey: randomUUID() })).status, 429)
      assert.deepEqual((await request('/api/inquiries', demand)).body, inquiry, '目录变化与限流不影响已成功需求的重试')
    })
    await t.test('生产首页预渲染、压缩及静态缓存保持可用', async () => {
      const response = await fetch(base + '/', { headers: { 'Accept-Encoding': 'gzip' } }), html = await response.text()
      assert.equal(response.status, 200); assert.equal(response.headers.get('content-encoding'), 'gzip')
      assert.match(html, /为你的品类，找到适合的群组与红人/); assert.match(html, /rel="modulepreload"/)
      assert.ok(!html.includes('href="/admin"'))
      const asset = html.match(/href="(\/assets\/home-entry-[^" ]+\.css)"/)[1]
      const css = await fetch(base + asset)
      assert.match(css.headers.get('cache-control'), /immutable/)
      const summary = await fetch(base + '/api/home', { headers: { 'Accept-Encoding': 'gzip;q=0' } })
      assert.equal(summary.headers.get('content-encoding'), null)
    })
  } finally { if (website.server.listening) await stop(); rmSync(directory, { recursive: true, force: true }) }
})
