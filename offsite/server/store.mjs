import { DatabaseSync } from 'node:sqlite'
import { mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { validateQrImage } from './qr-image.mjs'

export const projectRoot = resolve(import.meta.dirname, '..')
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}
const fail = message => { throw new HttpError(400, message) }
const text = (value, label, max = 300, required = false) => {
  if (typeof value !== 'string') fail(`${label}必须是文本`)
  const result = value.trim()
  if (required && !result) fail(`请填写${label}`)
  if (result.length > max) fail(`${label}不能超过 ${max} 个字符`)
  return result
}
const orderOf = value => {
  if (!Number.isInteger(value) || value < 0 || value > 100000) fail('排序须为 0–100000 的整数')
  return value
}
const linkOf = (value, label) => {
  const result = text(value, label, 3000)
  if (!result || result === '—') return result
  try { if (!['http:', 'https:'].includes(new URL(result, 'https://quote.snow123.com/').protocol)) fail(`${label}仅支持 http / https 链接`) }
  catch (error) { if (error instanceof HttpError) throw error; fail(`${label}格式不正确`) }
  return result
}

export function openStore({ dbPath = process.env.PRICING_DB_PATH || resolve(projectRoot, 'server/data/pricing.sqlite'), seedPath = resolve(projectRoot, 'public/data/snow123-pricing.js') } = {}) {
  if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(dbPath)
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS categories (id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id), payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, category_id TEXT NOT NULL REFERENCES categories(id), payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'published', sort_order INTEGER NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_category ON records(category_id, sort_order);
    CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, username TEXT NOT NULL REFERENCES admins(username), csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, failures INTEGER NOT NULL, resets_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiries (id TEXT PRIMARY KEY, request_key TEXT NOT NULL UNIQUE, payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS inquiry_limits (ip_hash TEXT PRIMARY KEY, submissions INTEGER NOT NULL, resets_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS case_images (id TEXT PRIMARY KEY, payload TEXT NOT NULL, image TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL);
  `)
  const meta = key => db.prepare('SELECT value FROM metadata WHERE key = ?').get(key)?.value
  const setMeta = (key, value) => db.prepare('INSERT INTO metadata(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value))
  const transaction = callback => {
    db.exec('BEGIN IMMEDIATE')
    try { const result = callback(); db.exec('COMMIT'); return result } catch (error) { db.exec('ROLLBACK'); throw error }
  }
  // Import once. Subsequent starts never overwrite administrator changes with the static snapshot.
  if (!meta('initialized')) {
    const input = readFileSync(seedPath, 'utf8')
    const seed = JSON.parse(input.slice(input.indexOf('{')).replace(/;\s*$/, ''))
    transaction(() => {
      for (const group of seed.groups) db.prepare('INSERT INTO groups(id, payload) VALUES (?, ?)').run(group.id, JSON.stringify(group))
      for (const category of seed.categoryMeta) db.prepare('INSERT INTO categories(id, group_id, payload) VALUES (?, ?, ?)').run(category.id, category.group_id, JSON.stringify(category))
      for (const [categoryId, rows] of Object.entries(seed.categories)) rows.forEach((row, index) => {
        db.prepare('INSERT INTO records(id, category_id, payload, sort_order, updated_at) VALUES (?, ?, ?, ?, ?)').run(`${categoryId}:${row.id ?? index}`, categoryId, JSON.stringify(row), index + 1, seed.syncedAt)
      })
      setMeta('initialized', '1'); setMeta('revision', '1'); setMeta('updatedAt', seed.syncedAt); setMeta('source', seed.source)
    })
  }
  if (!meta('pricingUpdatedAt')) setMeta('pricingUpdatedAt', db.prepare('SELECT MAX(updated_at) AS latest FROM records').get().latest || meta('updatedAt'))
  const markChanged = (pricing = true) => {
    const now = new Date().toISOString()
    setMeta('revision', Number(meta('revision') || 0) + 1); setMeta('updatedAt', now)
    if (pricing) setMeta('pricingUpdatedAt', now)
  }
  const groups = () => db.prepare('SELECT * FROM groups').all().map(row => { const data = JSON.parse(row.payload); return { ...data, is_deleted: Boolean(data.is_deleted), version: row.version } }).sort((a, b) => a.sort_order - b.sort_order)
  const categories = () => {
    const rank = new Map(groups().map((group, index) => [group.id, index]))
    return db.prepare('SELECT * FROM categories').all().map(row => ({ ...JSON.parse(row.payload), version: row.version })).sort((a, b) => rank.get(a.group_id) - rank.get(b.group_id) || a.sort_order - b.sort_order)
  }
  const records = () => db.prepare('SELECT * FROM records ORDER BY sort_order, id').all().map(row => ({ ...JSON.parse(row.payload), category_id: row.category_id, entryId: row.id, status: row.status, sort_order: row.sort_order, version: row.version, updatedAt: row.updated_at }))
  const adminCatalog = () => {
    const categoryMeta = categories(), rank = new Map(categoryMeta.map((category, index) => [category.id, index]))
    return { revision: Number(meta('revision')), updatedAt: meta('updatedAt'), groups: groups(), categoryMeta, records: records().sort((a, b) => rank.get(a.category_id) - rank.get(b.category_id) || a.sort_order - b.sort_order) }
  }
  const publicCatalog = () => {
    const visibleGroups = groups().filter(group => !group.is_deleted)
    const visibleCategories = categories().filter(category => category.is_visible && !category.is_deleted && visibleGroups.some(group => group.id === category.group_id))
    const allowed = new Set(visibleCategories.map(category => category.id))
    const result = Object.fromEntries(visibleCategories.map(category => [category.id, []]))
    for (const record of records()) {
      if (record.status !== 'published' || !allowed.has(record.category_id)) continue
      const { entryId, status, sort_order, version, updatedAt, ...data } = record
      result[record.category_id].push({ ...data, quotationUpdatedAt: updatedAt })
    }
    return { source: meta('source'), syncedAt: meta('pricingUpdatedAt'), revision: Number(meta('revision')), total: Object.values(result).reduce((sum, items) => sum + items.length, 0), groups: visibleGroups.map(({ version, ...group }) => group), categoryMeta: visibleCategories.map(({ version, ...category }) => category), categories: result }
  }
  const siteSettings = () => ({ email: '', wechat: '', wechatQr: '', caseMetric: '', casePeriod: '', caseCategory: '', caseSource: '', caseGrowth: '156', casePublished: false, version: 1, ...JSON.parse(meta('siteSettings') || '{}') })
  const publicSummary = () => {
    const visibleGroups = groups().filter(group => !group.is_deleted)
    const counts = new Map(db.prepare("SELECT category_id, COUNT(*) AS total FROM records WHERE status = 'published' GROUP BY category_id").all().map(row => [row.category_id, row.total]))
    const categoryMeta = categories().filter(category => category.is_visible && !category.is_deleted && visibleGroups.some(group => group.id === category.group_id)).map(({ version, ...category }) => ({ ...category, count: counts.get(category.id) || 0 }))
    const settings = siteSettings()
    return { total: categoryMeta.reduce((sum, category) => sum + category.count, 0), groups: visibleGroups.map(({ version, ...group }) => group), categoryMeta, revision: Number(meta('revision')), updatedAt: meta('updatedAt'), contact: { email: settings.email, wechat: settings.wechat, wechatQr: settings.wechatQr ? `/api/wechat-qr?v=${settings.version}` : '' }, caseImages: listCaseImages().filter(item => item.is_visible).map(({ version, is_visible, sort_order, ...item }) => item), case: settings.casePublished ? { growth: settings.caseGrowth, metric: settings.caseMetric, period: settings.casePeriod, category: settings.caseCategory, source: settings.caseSource } : null }
  }
  const saveSiteSettings = input => transaction(() => {
    const previous = siteSettings()
    if (input.version !== previous.version) throw new HttpError(409, '首页设置已被修改，请刷新后再保存')
    const settings = { version: previous.version + 1 }
    settings.wechatQr = validateQrImage(input.wechatQr ?? previous.wechatQr, fail)
    for (const [key, label, max] of [['email', '顾问邮箱', 254], ['wechat', '顾问微信', 80], ['caseMetric', '增长指标', 80], ['casePeriod', '统计周期', 120], ['caseCategory', '产品品类', 120], ['caseSource', '案例说明', 1000], ['caseGrowth', '增长百分比', 12]]) settings[key] = text(input[key] ?? '', label, max)
    if (settings.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.email)) fail('请填写有效的邮箱')
    if (typeof input.casePublished !== 'boolean') fail('案例展示状态不正确')
    settings.casePublished = input.casePublished
    if (settings.casePublished && (!/^\d+(\.\d{1,2})?$/.test(settings.caseGrowth) || !settings.caseMetric || !settings.casePeriod || !settings.caseCategory || !settings.caseSource)) fail('发布案例前，请补齐增长指标、百分比、统计周期、产品品类与数据说明')
    setMeta('siteSettings', JSON.stringify(settings)); markChanged(false); return settings
  })
  const listCaseImages = () => db.prepare('SELECT id, payload, version FROM case_images').all().map(row => ({ id: row.id, ...JSON.parse(row.payload), version: row.version, image: `/api/case-images/${row.id}?v=${row.version}` })).sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
  const caseImage = (id, privateAccess = false) => {
    const row = db.prepare('SELECT * FROM case_images WHERE id = ?').get(id)
    if (!row || (!privateAccess && !JSON.parse(row.payload).is_visible)) throw new HttpError(404, '案例图片不存在或尚未发布')
    return row.image
  }
  const saveCaseImage = (id, input) => transaction(() => {
    const previous = id ? db.prepare('SELECT * FROM case_images WHERE id = ?').get(id) : null
    if (id) checkVersion(previous, input)
    if (!id && db.prepare('SELECT COUNT(*) AS count FROM case_images').get().count >= 60) fail('最多保存 60 张案例图片')
    const image = input.image === undefined && previous ? previous.image : validateQrImage(input.image, fail, '案例', 1024 * 1024)
    if (!image) fail('请上传案例图片')
    const payload = { title: text(input.title, '案例标题', 80, true), category: text(input.category ?? '', '案例品类', 80), desc: text(input.desc ?? '', '合作内容', 500), is_visible: input.is_visible, sort_order: orderOf(input.sort_order) }
    if (typeof payload.is_visible !== 'boolean') fail('案例展示状态不正确')
    if (payload.is_visible && (!payload.category || !payload.desc)) fail('发布前请填写产品品类与合作内容')
    const entryId = id || randomUUID(), now = new Date().toISOString()
    if (previous) db.prepare('UPDATE case_images SET payload = ?, image = ?, version = version + 1, updated_at = ? WHERE id = ?').run(JSON.stringify(payload), image, now, entryId)
    else db.prepare('INSERT INTO case_images(id, payload, image, updated_at) VALUES (?, ?, ?, ?)').run(entryId, JSON.stringify(payload), image, now)
    markChanged(false)
    return listCaseImages().find(item => item.id === entryId)
  })
  const listInquiries = () => db.prepare('SELECT * FROM inquiries ORDER BY created_at DESC, id DESC LIMIT 500').all().map(({ request_key, payload, ...row }) => ({ ...row, ...JSON.parse(payload) }))
  const createInquiry = (input, ipHash) => transaction(() => {
    const key = text(input.requestKey, '提交凭证', 80, true)
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(key)) fail('提交凭证不正确，请刷新后重试')
    const payload = {}
    for (const [field, label, limit, required] of [['name', '称呼', 80, true], ['contact', '联系方式', 200, true], ['productUrl', '产品链接', 2000], ['category', '产品品类', 120, true], ['market', '目标市场', 120], ['goal', '推广目标', 120], ['budget', '预算', 120], ['notes', '推广需求', 4000]]) payload[field] = text(input[field] ?? '', label, limit, required)
    if (payload.productUrl) {
      try { if (!['http:', 'https:'].includes(new URL(payload.productUrl).protocol)) fail('产品链接须以 https:// 或 http:// 开头') } catch { fail('请填写有效的产品链接') }
    }
    if (input.consent !== true) fail('请同意将需求与联系方式用于本次合作沟通')
    if (input.website) fail('提交失败，请重试')
    if (input.selectionIds !== undefined && (!Array.isArray(input.selectionIds) || input.selectionIds.length > 50 || input.selectionIds.some(id => typeof id !== 'string' || id.length > 160))) fail('意向渠道最多选择 50 项')
    payload.selectionIds = [...new Set(input.selectionIds || [])]
    const previous = db.prepare('SELECT id, payload FROM inquiries WHERE request_key = ?').get(key)
    if (previous) {
      const { selections, ...intent } = JSON.parse(previous.payload)
      if (JSON.stringify(intent) !== JSON.stringify(payload)) throw new HttpError(409, '本次需求已经提交，请重新开始一份需求')
      return { id: previous.id }
    }
    // Resolve selections on the server; do not accept client-provided pricing as a final quote.
    const publicData = input.selectionIds?.length ? publicCatalog() : null
    const selectionMap = new Map(Object.entries(publicData?.categories || {}).flatMap(([categoryId, rows]) => rows.map((row, index) => [`${categoryId}:${row.id || index}`, { ...row, categoryId }])))
    payload.selections = payload.selectionIds.flatMap(id => {
      const record = selectionMap.get(id)
      return record ? [{ name: record.name, category: record.categoryId, price: record.price, currency: record.currency }] : []
    })
    const serialized = JSON.stringify(payload)
    const now = Date.now(), limit = db.prepare('SELECT * FROM inquiry_limits WHERE ip_hash = ?').get(ipHash)
    if (limit?.resets_at > now && limit.submissions >= 5) throw new HttpError(429, '提交次数较多，请 15 分钟后再试')
    db.prepare('DELETE FROM inquiry_limits WHERE resets_at <= ?').run(now)
    db.prepare('INSERT INTO inquiry_limits(ip_hash, submissions, resets_at) VALUES (?, 1, ?) ON CONFLICT(ip_hash) DO UPDATE SET submissions = submissions + 1').run(ipHash, now + 900000)
    const id = randomUUID(), date = new Date(now).toISOString()
    db.prepare('INSERT INTO inquiries(id, request_key, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(id, key, serialized, date, date)
    return { id }
  })
  const saveInquiry = (id, input) => transaction(() => {
    const row = db.prepare('SELECT * FROM inquiries WHERE id = ?').get(id)
    checkVersion(row, input)
    if (!['new', 'contacted', 'closed'].includes(input.status)) fail('需求状态不正确')
    db.prepare('UPDATE inquiries SET status = ?, version = version + 1, updated_at = ? WHERE id = ?').run(input.status, new Date().toISOString(), id)
    return listInquiries().find(item => item.id === id)
  })
  const checkVersion = (row, input) => {
    if (!row) throw new HttpError(404, '该条信息已不存在，请刷新列表')
    if (!Number.isInteger(input.version) || input.version !== row.version) throw new HttpError(409, '该条信息已被修改，请刷新列表后重新编辑')
  }
  const saveRecord = (entryId, input) => transaction(() => {
    const row = entryId ? db.prepare('SELECT * FROM records WHERE id = ?').get(entryId) : null
    if (entryId) checkVersion(row, input)
    if (row?.status === 'deleted') fail('请先从回收站恢复该报价，再编辑')
    const categoryId = text(input.category_id, '所属分类', 120, true)
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(categoryId)) fail('请选择有效的所属分类')
    if (!['published', 'draft', 'archived'].includes(input.status)) fail('请选择有效的展示状态')
    const payload = row ? JSON.parse(row.payload) : { id: randomUUID() }
    for (const [key, label, limit, required] of [['name', '渠道 / 服务名称', 200, true], ['category', '渠道类型', 200], ['price', '参考报价', 500], ['form', '发布形式', 300], ['platform', '市场 / 平台', 300], ['time', '交付时效', 300], ['traffic', '月流量', 300], ['desc', '合作要求与服务说明', 20000]]) payload[key] = text(input[key] ?? '', label, limit, required)
    payload.currency = text(input.currency, '币种', 3, true).toUpperCase()
    if (!/^[A-Z]{3}$/.test(payload.currency)) fail('币种请填写三位大写代码，例如 CNY / USD / EUR')
    payload.url = linkOf(input.url ?? '', '渠道链接'); payload.sample_url = linkOf(input.sample_url ?? '', '案例链接'); payload.category_id = categoryId
    const sortOrder = orderOf(input.sort_order), id = entryId || randomUUID(), now = new Date().toISOString()
    if (row) db.prepare('UPDATE records SET category_id = ?, payload = ?, status = ?, sort_order = ?, version = version + 1, updated_at = ? WHERE id = ?').run(categoryId, JSON.stringify(payload), input.status, sortOrder, now, id)
    else db.prepare('INSERT INTO records(id, category_id, payload, status, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, categoryId, JSON.stringify(payload), input.status, sortOrder, now)
    markChanged()
    return records().find(record => record.entryId === id)
  })
  const setRecordStatus = (entryId, input) => transaction(() => {
    const row = db.prepare('SELECT * FROM records WHERE id = ?').get(entryId)
    checkVersion(row, input)
    if (!['published', 'draft', 'archived', 'deleted'].includes(input.status)) fail('请选择有效的展示状态')
    if (row.status === 'deleted' && input.status !== 'draft') fail('请先将回收站报价恢复为草稿')
    db.prepare('UPDATE records SET status = ?, version = version + 1, updated_at = ? WHERE id = ?').run(input.status, new Date().toISOString(), entryId)
    markChanged()
    return records().find(record => record.entryId === entryId)
  })
  const saveCategory = (id, input) => transaction(() => {
    const row = id ? db.prepare('SELECT * FROM categories WHERE id = ?').get(id) : null
    if (id) checkVersion(row, input)
    const groupId = text(input.group_id, '业务分组', 120, true)
    if (!db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId)) fail('请选择有效的业务分组')
    if (typeof input.is_visible !== 'boolean') fail('分类展示状态不正确')
    const categoryId = id || `category-${randomUUID()}`
    const payload = { ...(row ? JSON.parse(row.payload) : {}), id: categoryId, label: text(input.label, '分类名称', 80, true), group_id: groupId, icon: text(input.icon ?? '', '分类图标', 20), sort_order: orderOf(input.sort_order), is_visible: input.is_visible, is_deleted: false }
    if (row) db.prepare('UPDATE categories SET group_id = ?, payload = ?, version = version + 1 WHERE id = ?').run(groupId, JSON.stringify(payload), id)
    else db.prepare('INSERT INTO categories(id, group_id, payload) VALUES (?, ?, ?)').run(categoryId, groupId, JSON.stringify(payload))
    markChanged(); return categories().find(category => category.id === categoryId)
  })
  const saveGroup = (id, input) => transaction(() => {
    const row = id ? db.prepare('SELECT * FROM groups WHERE id = ?').get(id) : null
    if (id) checkVersion(row, input)
    if (typeof input.is_deleted !== 'boolean') fail('分组展示状态不正确')
    const groupId = id || `group-${randomUUID()}`
    const payload = { ...(row ? JSON.parse(row.payload) : {}), id: groupId, title: text(input.title, '业务分组名称', 80, true), sort_order: orderOf(input.sort_order), is_deleted: input.is_deleted }
    if (row) db.prepare('UPDATE groups SET payload = ?, version = version + 1 WHERE id = ?').run(JSON.stringify(payload), id)
    else db.prepare('INSERT INTO groups(id, payload) VALUES (?, ?)').run(groupId, JSON.stringify(payload))
    markChanged(); return groups().find(group => group.id === groupId)
  })
  return { db, transaction, adminCatalog, publicCatalog, publicSummary, siteSettings, saveSiteSettings, listCaseImages, caseImage, saveCaseImage, listInquiries, createInquiry, saveInquiry, saveRecord, setRecordStatus, saveCategory, saveGroup, close: () => db.close() }
}
