import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { once } from 'node:events'
import { createWebsiteServer } from './index.mjs'

test('公开域名部署：反向代理的本机连接仍需初始化密钥', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'yingyao-proxy-test-'))
  const website = createWebsiteServer({ dbPath: join(directory, 'pricing.sqlite'), publicOrigin: 'https://pricing.example', bootstrapToken: 'isolated-test-setup-secret' })
  website.server.listen(0, '127.0.0.1'); await once(website.server, 'listening')
  const base = `http://127.0.0.1:${website.server.address().port}`
  const setup = token => fetch(base + '/api/auth/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://pricing.example' }, body: JSON.stringify({ username: 'admin', password: 'isolated-test-password', bootstrapToken: token }) })
  try {
    assert.equal((await setup()).status, 403)
    assert.equal((await setup('wrong')).status, 403)
    const response = await setup('isolated-test-setup-secret')
    assert.equal(response.status, 201); assert.match(response.headers.get('set-cookie'), /; Secure/)
  } finally { const closed = once(website.server, 'close'); website.server.close(); await closed; rmSync(directory, { recursive: true, force: true }) }
})

test('报价后台：导入、权限、完整编辑、目录管理、持久化与会话', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'yingyao-backend-test-'))
  const dbPath = join(directory, 'pricing.sqlite')
  let website, base, cookie = '', csrf = ''
  const start = async () => {
    website = createWebsiteServer({ dbPath })
    website.server.listen(0, '127.0.0.1'); await once(website.server, 'listening')
    base = `http://127.0.0.1:${website.server.address().port}`
  }
  const stop = async () => { const closed = once(website.server, 'close'); website.server.close(); await closed }
  const request = async (path, { method = 'GET', body, authorized = true, headers = {} } = {}) => {
    const response = await fetch(base + path, { method, headers: { ...(body ? { 'Content-Type': 'application/json', Origin: base } : {}), ...(authorized && cookie ? { Cookie: cookie, 'X-CSRF-Token': csrf } : {}), ...headers }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, body: await response.json(), headers: response.headers }
  }
  try {
    await start()
    await t.test('首次导入完整 612 项，并保护管理接口', async () => {
      const seedText = readFileSync(new URL('../public/data/snow123-pricing.js', import.meta.url), 'utf8')
      const seed = JSON.parse(seedText.slice(seedText.indexOf('{')).replace(/;\s*$/, ''))
      const response = await request('/api/catalog')
      assert.equal(response.body.total, 612)
      assert.equal(Object.keys(response.body.categories).length, 15)
      for (const [id, rows] of Object.entries(seed.categories)) {
        assert.deepEqual(response.body.categories[id].map(({ quotationUpdatedAt, ...record }) => record), rows)
        assert.ok(response.body.categories[id].every(record => record.quotationUpdatedAt === seed.syncedAt))
      }
      assert.equal((await request('/api/admin/catalog')).status, 401)
      assert.equal((await request('/api/admin/export')).status, 401)
      assert.equal((await fetch(base + '/data/snow123-pricing.js')).status, 404)
      assert.equal((await fetch(base + '/%64ata/snow123-pricing.js')).status, 404)
      assert.equal((await request('/api/auth/session')).body.setupRequired, true)
      assert.equal((await request('/api/auth/setup', { method: 'POST', body: { username: 'admin', password: 'test-password-2026' }, headers: { Host: 'untrusted.example', Origin: 'http://untrusted.example' } })).status, 403)
      assert.equal((await request('/api/auth/setup', { method: 'POST', body: { username: 'admin', password: 'short' } })).status, 400)
      const setup = await request('/api/auth/setup', { method: 'POST', body: { username: 'admin', password: 'test-password-2026' } })
      assert.equal(setup.status, 201)
      cookie = setup.headers.get('set-cookie').split(';')[0]; csrf = setup.body.user.csrfToken
      assert.match(setup.headers.get('set-cookie'), /HttpOnly/)
      assert.match(setup.headers.get('set-cookie'), /SameSite=Strict/)
      assert.equal((await request('/api/auth/setup', { method: 'POST', body: { username: 'other', password: 'test-password-2026' } })).status, 409)
      const hash = website.api.store.db.prepare('SELECT password_hash FROM admins').get().password_hash
      assert.notEqual(hash, 'test-password-2026'); assert.match(hash, /^[a-f0-9]+:[a-f0-9]+$/)
    })
    let categoryId, groupId, record, edited
    await t.test('新增报价字段完整、验证输入、防止跨站和旧版本覆盖', async () => {
      const catalog = (await request('/api/admin/catalog')).body
      assert.equal(catalog.records.length, 612); assert.equal(catalog.categoryMeta.length, 17)
      const originalGroup = catalog.groups[0]
      const groupEdit = await request(`/api/admin/groups/${originalGroup.id}`, { method: 'PATCH', body: { ...originalGroup, title: '站外推广' } })
      assert.equal(groupEdit.status, 200, '导入的分组可直接修改，无需先切换隐藏状态')
      const input = { name: '测试全字段报价', category_id: 'us', category: 'Deal 站', price: '120.55–180.75', currency: 'USD', platform: '美国 / AMZ', form: '折扣发布', time: '1–3 天', traffic: '100 万', url: 'https://example.com/channel', sample_url: '/case/example', desc: '评分 ≥ 4.2\n保留全部合作要求。', sort_order: 90, status: 'draft' }
      assert.equal((await request('/api/admin/records', { method: 'POST', body: input, authorized: false })).status, 401)
      assert.equal((await request('/api/admin/records', { method: 'POST', body: input, headers: { 'X-CSRF-Token': '' } })).status, 403)
      assert.equal((await request('/api/admin/records', { method: 'POST', body: input, headers: { Origin: 'https://attacker.example' } })).status, 403)
      assert.equal((await request('/api/admin/records', { method: 'POST', body: { ...input, url: 'javascript:alert(1)' } })).status, 400)
      assert.equal((await request('/api/admin/records', { method: 'POST', body: { ...input, category_id: 'missing' } })).status, 400)
      const added = await request('/api/admin/records', { method: 'POST', body: input })
      assert.equal(added.status, 201); record = added.body.item
      for (const [key, value] of Object.entries(input)) assert.equal(record[key], value)
      assert.equal((await request('/api/catalog')).body.total, 612, '草稿不公开')
      const published = await request(`/api/admin/records/${encodeURIComponent(record.entryId)}`, { method: 'PATCH', body: { ...record, status: 'published', price: '0.125' } })
      assert.equal(published.status, 200); edited = published.body.item
      assert.equal(edited.version, 2)
      assert.equal((await request('/api/catalog')).body.categories.us.find(item => item.name === input.name).price, '0.125')
      assert.equal((await request(`/api/admin/records/${encodeURIComponent(record.entryId)}`, { method: 'PATCH', body: { ...record, price: '999' } })).status, 409)
      assert.equal((await request(`/api/admin/records/${encodeURIComponent(record.entryId)}`, { method: 'PATCH', body: { ...edited, price: 99 } })).status, 400)
    })
    await t.test('创建分组、分类、移动报价、隐藏和重新展示', async () => {
      const group = await request('/api/admin/groups', { method: 'POST', body: { title: '新业务分组', sort_order: 5, is_deleted: false } })
      assert.equal(group.status, 201); groupId = group.body.item.id
      const category = await request('/api/admin/categories', { method: 'POST', body: { label: '新报价分类', icon: '🌍', group_id: groupId, sort_order: 1, is_visible: true } })
      assert.equal(category.status, 201); categoryId = category.body.item.id
      const moved = await request(`/api/admin/records/${encodeURIComponent(edited.entryId)}`, { method: 'PATCH', body: { ...edited, category_id: categoryId, price: '按套餐报价' } })
      assert.equal(moved.status, 200); edited = moved.body.item
      assert.equal((await request('/api/catalog')).body.categories[categoryId][0].price, '按套餐报价')
      const hidden = await request(`/api/admin/categories/${categoryId}`, { method: 'PATCH', body: { ...category.body.item, is_visible: false } })
      assert.equal(hidden.status, 200)
      assert.equal((await request('/api/catalog')).body.categories[categoryId], undefined)
      assert.equal((await request('/api/admin/catalog')).body.records.length, 613)
      await request(`/api/admin/categories/${categoryId}`, { method: 'PATCH', body: { ...hidden.body.item, is_visible: true } })
      const hiddenGroup = await request(`/api/admin/groups/${groupId}`, { method: 'PATCH', body: { ...group.body.item, is_deleted: true } })
      assert.equal((await request('/api/catalog')).body.categories[categoryId], undefined)
      await request(`/api/admin/groups/${groupId}`, { method: 'PATCH', body: { ...hiddenGroup.body.item, is_deleted: false } })
      const archived = await request(`/api/admin/records/${encodeURIComponent(edited.entryId)}`, { method: 'PATCH', body: { ...edited, status: 'archived' } })
      assert.equal((await request('/api/catalog')).body.total, 612)
      edited = archived.body.item
      const backup = await request('/api/admin/export')
      assert.equal(backup.body.schemaVersion, 1); assert.equal(backup.body.records.length, 613)
      assert.equal(backup.body.records.find(item => item.entryId === edited.entryId).desc, edited.desc)
    })
    await t.test('删除进入回收站，保护权限与版本，重启后可恢复为草稿', async () => {
      const path = `/api/admin/records/${encodeURIComponent(edited.entryId)}/status`
      const input = { status: 'deleted', version: edited.version }
      assert.equal((await request(path, { method: 'PATCH', body: input, authorized: false })).status, 401)
      assert.equal((await request(path, { method: 'PATCH', body: input, headers: { 'X-CSRF-Token': '' } })).status, 403)
      assert.equal((await request(path, { method: 'PATCH', body: input, headers: { Origin: 'https://attacker.example' } })).status, 403)
      assert.equal((await request(path, { method: 'PATCH', body: { status: 'deleted' } })).status, 409)
      assert.equal((await request(path, { method: 'PATCH', body: { ...input, status: 'invalid' } })).status, 400)
      const published = await request(path, { method: 'PATCH', body: { ...input, status: 'published' } })
      assert.equal(published.status, 200)
      edited = published.body.item
      assert.equal((await request('/api/catalog')).body.total, 613)
      const deleted = await request(path, { method: 'PATCH', body: { status: 'deleted', version: edited.version } })
      assert.equal(deleted.status, 200)
      assert.equal(deleted.body.item.desc, edited.desc)
      assert.equal(deleted.body.item.price, edited.price)
      assert.equal(deleted.body.item.version, edited.version + 1)
      edited = deleted.body.item
      assert.equal((await request('/api/catalog')).body.total, 612)
      assert.equal((await request('/api/home')).body.total, 612)
      assert.equal((await request('/api/admin/catalog')).body.records.length, 613)
      assert.equal((await request('/api/admin/export')).body.records.find(x => x.entryId === edited.entryId).status, 'deleted')
      assert.equal((await request(path, { method: 'PATCH', body: input })).status, 409)
      assert.equal((await request(path, { method: 'PATCH', body: { version: edited.version, status: 'published' } })).status, 400)
      assert.equal((await request(`/api/admin/records/${encodeURIComponent(edited.entryId)}`, { method: 'PATCH', body: { ...edited, status: 'published' } })).status, 400)
      await stop(); await start()
      const retained = (await request('/api/admin/catalog')).body.records.find(x => x.entryId === edited.entryId)
      assert.equal(retained.status, 'deleted')
      const restored = await request(path, { method: 'PATCH', body: { status: 'draft', version: retained.version } })
      assert.equal(restored.status, 200)
      assert.equal(restored.body.item.status, 'draft')
      assert.equal(restored.body.item.price, edited.price)
      assert.equal((await request('/api/catalog')).body.total, 612, '恢复不自动上架')
      const republished = await request(path, { method: 'PATCH', body: { status: 'published', version: restored.body.item.version } })
      assert.equal(republished.status, 200)
      assert.equal((await request('/api/catalog')).body.total, 613)
      edited = (await request(path, { method: 'PATCH', body: { status: 'archived', version: republished.body.item.version } })).body.item
      assert.equal((await request('/api/catalog')).body.total, 612)
    })
    await t.test('重启保留修改，管理员数据及会话均持久保存', async () => {
      await stop(); await start()
      const data = await request('/api/admin/catalog')
      assert.equal(data.status, 200); assert.equal(data.body.records.length, 613)
      assert.equal(data.body.records.find(item => item.entryId === edited.entryId).price, '按套餐报价')
      assert.equal((await request('/api/auth/session')).body.setupRequired, false)
    })
    await t.test('登录、修改密码、撤销旧会话、登出与登录限流', async () => {
      assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'incorrect' } })).status, 401)
      const login = await request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'test-password-2026' } })
      assert.equal(login.status, 200)
      const previousCookie = cookie; cookie = login.headers.get('set-cookie').split(';')[0]; csrf = login.body.user.csrfToken
      assert.equal((await request('/api/admin/catalog', { headers: { Cookie: previousCookie } })).status, 401)
      const changed = await request('/api/auth/password', { method: 'POST', body: { currentPassword: 'test-password-2026', password: 'new-test-password-2026' } })
      assert.equal(changed.status, 200)
      assert.equal((await request('/api/admin/catalog')).status, 401)
      cookie = changed.headers.get('set-cookie').split(';')[0]; csrf = changed.body.user.csrfToken
      assert.equal((await request('/api/auth/logout', { method: 'POST', body: {} })).status, 200)
      assert.equal((await request('/api/admin/catalog')).status, 401)
      for (let i = 0; i < 10; i++) assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'bad-password' } })).status, 401)
      assert.equal((await request('/api/auth/login', { method: 'POST', body: { username: 'admin', password: 'new-test-password-2026' } })).status, 429)
    })
  } finally { if (website.server.listening) await stop(); rmSync(directory, { recursive: true, force: true }) }
})
