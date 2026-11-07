import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'
import { gzipSync } from 'node:zlib'
import { isIP } from 'node:net'
import { openStore, HttpError } from './store.mjs'

const scrypt = promisify(scryptCallback)
const hashToken = token => createHash('sha256').update(token).digest('hex')
const constantEqual = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y) }
const cookieName = 'yingyao_admin'
const lifetime = 8 * 60 * 60 * 1000
async function passwordHash(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64)
  return `${salt}:${key.toString('hex')}`
}
async function passwordMatches(password, stored) {
  const [salt, key] = stored.split(':')
  const actual = await scrypt(password, salt, 64)
  return constantEqual(actual.toString('hex'), key)
}
function credentials(input) {
  if (typeof input.username !== 'string' || !/^[a-zA-Z0-9_.-]{3,40}$/.test(input.username)) throw new HttpError(400, '账号使用 3–40 位字母、数字、下划线或短横线')
  if (typeof input.password !== 'string' || input.password.length < 10 || input.password.length > 128) throw new HttpError(400, '密码须为 10–128 个字符')
  return { username: input.username, password: input.password }
}
async function readBody(req, limit = 128 * 1024) {
  if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415, '请求须使用 JSON 格式')
  let size = 0, chunks = []
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new HttpError(413, '提交内容过大')
    chunks.push(chunk)
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString())
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch { throw new HttpError(400, '提交内容不是有效的 JSON 对象') }
}
function json(res, status, value) {
  let body = Buffer.from(JSON.stringify(value))
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', Vary: 'Accept-Encoding' }
  if (body.length > 1024 && res.req.headers['accept-encoding']?.split(',').some(value => /^gzip(?:\s*;\s*q=(?!0(?:\.0*)?$)[\d.]+)?\s*$/.test(value.trim()))) { body = gzipSync(body); headers['Content-Encoding'] = 'gzip' }
  headers['Content-Length'] = body.length
  res.writeHead(status, headers)
  res.end(body)
}
function sendImage(res, image) {
  const [prefix, data] = image.split(',')
  const body = Buffer.from(data, 'base64')
  res.writeHead(200, { 'Content-Type': prefix.slice(5, -7), 'Content-Length': body.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
  res.end(body)
}

export function createApi(options = {}) {
  const store = openStore(options), { db } = store
  const publicOrigin = options.publicOrigin ?? process.env.PUBLIC_ORIGIN
  const bootstrapToken = options.bootstrapToken ?? process.env.BOOTSTRAP_TOKEN
  const trustLocalProxy = options.trustLocalProxy ?? process.env.TRUST_LOCAL_PROXY === '1'
  const clientAddress = req => {
    const remote = req.socket.remoteAddress || 'unknown'
    // Only trust one explicitly enabled proxy hop on the server's loopback interface.
    const forwarded = req.headers['x-forwarded-for']?.split(',').at(-1)?.trim()
    return trustLocalProxy && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote) && isIP(forwarded || '') ? forwarded : remote
  }
  let dummyHash
  const secure = publicOrigin?.startsWith('https:')
  const setCookie = (res, token, expired = false) => res.setHeader('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expired ? 0 : lifetime / 1000}${secure ? '; Secure' : ''}`)
  const setupRequired = () => !db.prepare('SELECT username FROM admins LIMIT 1').get()
  const currentSession = req => {
    const raw = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
    if (!raw || !/^[a-f0-9]{64}$/.test(raw)) return null
    const session = db.prepare('SELECT * FROM sessions WHERE token_hash = ? AND expires_at > ?').get(hashToken(raw), Date.now())
    return session || null
  }
  const auth = req => { const session = currentSession(req); if (!session) throw new HttpError(401, '请先登录管理后台'); return session }
  const sessionCreate = (username, res) => {
    const token = randomBytes(32).toString('hex'), csrfToken = randomBytes(32).toString('hex')
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now())
    db.prepare('INSERT INTO sessions(token_hash, username, csrf_token, expires_at) VALUES (?, ?, ?, ?)').run(hashToken(token), username, csrfToken, Date.now() + lifetime)
    setCookie(res, token); return { username, csrfToken }
  }
  const requireSameOrigin = req => {
    const origin = req.headers.origin
    const expected = publicOrigin || `http://${req.headers.host}`
    if ((origin && origin !== expected) || req.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, '不允许跨站提交')
  }
  const requireCsrf = (req, session) => { if (!constantEqual(String(req.headers['x-csrf-token'] || ''), session.csrf_token)) throw new HttpError(403, '操作凭证失效，请刷新页面后重试') }
  const rateCheck = ip => {
    const attempt = db.prepare('SELECT * FROM login_attempts WHERE ip = ?').get(ip)
    if (attempt?.resets_at > Date.now() && attempt.failures >= 10) throw new HttpError(429, '尝试次数过多，请 15 分钟后重试')
  }
  const rateFail = ip => db.prepare('INSERT INTO login_attempts(ip, failures, resets_at) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET failures = CASE WHEN resets_at <= ? THEN 1 ELSE failures + 1 END, resets_at = CASE WHEN resets_at <= ? THEN excluded.resets_at ELSE resets_at END').run(ip, Date.now() + 900000, Date.now(), Date.now())
  const handler = async (req, res, next) => {
    const path = new URL(req.url, 'http://localhost').pathname
    // The legacy snapshot is a database seed, not a second public pricing endpoint.
    try { if (decodeURIComponent(path).startsWith('/data/')) return json(res, 404, { error: '资源不存在' }) }
    catch { return json(res, 400, { error: '请求路径不正确' }) }
    if (!path.startsWith('/api/')) { if (next) return next(); return false }
    try {
      if (!['GET', 'POST', 'PATCH'].includes(req.method)) throw new HttpError(405, '该操作不支持此请求方法')
      if (req.method !== 'GET') requireSameOrigin(req)
      if (path === '/api/catalog' && req.method === 'GET') return json(res, 200, store.publicCatalog())
      if (path === '/api/home' && req.method === 'GET') return json(res, 200, store.publicSummary())
      if (path === '/api/wechat-qr' && req.method === 'GET') {
        const image = store.siteSettings().wechatQr
        if (!image) throw new HttpError(404, '微信二维码暂未设置')
        return sendImage(res, image)
      }
      const caseImageMatch = path.match(/^\/api\/case-images\/([a-f0-9-]+)$/)
      if (caseImageMatch && req.method === 'GET') return sendImage(res, store.caseImage(caseImageMatch[1], Boolean(currentSession(req))))
      if (path === '/api/inquiries' && req.method === 'POST') return json(res, 201, store.createInquiry(await readBody(req), hashToken(clientAddress(req))))
      if (path === '/api/auth/session' && req.method === 'GET') {
        const session = currentSession(req)
        return json(res, 200, { setupRequired: setupRequired(), user: session ? { username: session.username, csrfToken: session.csrf_token } : null })
      }
      if (path === '/api/auth/setup' && req.method === 'POST') {
        if (!setupRequired()) throw new HttpError(409, '管理员已经设置，请直接登录')
        const input = await readBody(req)
        const localSocket = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
        const hostname = new URL(`http://${req.headers.host}`).hostname
        // A reverse proxy also connects from loopback; deployed public origins always require the setup secret.
        const local = localSocket && !publicOrigin && ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
        if (!local && !(bootstrapToken && typeof input.bootstrapToken === 'string' && constantEqual(input.bootstrapToken, bootstrapToken))) throw new HttpError(403, '请在服务器本机初始化，或填写部署时设置的初始化密钥')
        const { username, password } = credentials(input), hash = await passwordHash(password)
        store.transaction(() => {
          if (!setupRequired()) throw new HttpError(409, '管理员已经设置，请直接登录')
          db.prepare('INSERT INTO admins(username, password_hash) VALUES (?, ?)').run(username, hash)
        })
        return json(res, 201, { user: sessionCreate(username, res) })
      }
      if (path === '/api/auth/login' && req.method === 'POST') {
        const ip = clientAddress(req); rateCheck(ip)
        const input = await readBody(req)
        if (typeof input.username !== 'string' || typeof input.password !== 'string' || input.password.length > 128) throw new HttpError(400, '账号或密码格式不正确')
        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(input.username)
        dummyHash ||= await passwordHash(randomBytes(20).toString('hex'))
        const valid = await passwordMatches(input.password, admin?.password_hash || dummyHash)
        if (!admin || !valid) { rateFail(ip); throw new HttpError(401, '账号或密码不正确') }
        db.prepare('DELETE FROM login_attempts WHERE ip = ?').run(ip)
        const previous = currentSession(req)
        if (previous) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(previous.token_hash)
        return json(res, 200, { user: sessionCreate(admin.username, res) })
      }
      const session = auth(req)
      if (req.method !== 'GET') requireCsrf(req, session)
      if (path === '/api/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.token_hash)
        setCookie(res, '', true); return json(res, 200, { ok: true })
      }
      if (path === '/api/auth/password' && req.method === 'POST') {
        const input = await readBody(req)
        credentials({ username: session.username, password: input.password })
        const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(session.username)
        if (typeof input.currentPassword !== 'string' || input.currentPassword.length > 128 || !(await passwordMatches(input.currentPassword, admin.password_hash))) throw new HttpError(400, '当前密码不正确')
        const hash = await passwordHash(input.password)
        store.transaction(() => { db.prepare('UPDATE admins SET password_hash = ? WHERE username = ?').run(hash, session.username); db.prepare('DELETE FROM sessions WHERE username = ?').run(session.username) })
        return json(res, 200, { user: sessionCreate(session.username, res) })
      }
      if (path === '/api/admin/catalog' && req.method === 'GET') return json(res, 200, store.adminCatalog())
      if (path === '/api/admin/site' && req.method === 'GET') return json(res, 200, store.siteSettings())
      if (path === '/api/admin/site' && req.method === 'PATCH') return json(res, 200, store.saveSiteSettings(await readBody(req, 768 * 1024)))
      if (path === '/api/admin/cases' && req.method === 'GET') return json(res, 200, { items: store.listCaseImages() })
      if (path === '/api/admin/cases' && req.method === 'POST') return json(res, 201, { item: store.saveCaseImage(null, await readBody(req, 1536 * 1024)) })
      const caseMatch = path.match(/^\/api\/admin\/cases\/([a-f0-9-]+)$/)
      if (caseMatch && req.method === 'PATCH') return json(res, 200, { item: store.saveCaseImage(caseMatch[1], await readBody(req, 1536 * 1024)) })
      if (path === '/api/admin/inquiries' && req.method === 'GET') return json(res, 200, { items: store.listInquiries() })
      const inquiryMatch = path.match(/^\/api\/admin\/inquiries\/([a-f0-9-]+)$/)
      if (inquiryMatch && req.method === 'PATCH') return json(res, 200, { item: store.saveInquiry(inquiryMatch[1], await readBody(req)) })
      if (path === '/api/admin/export' && req.method === 'GET') {
        res.setHeader('Content-Disposition', `attachment; filename="yingyao-pricing-${new Date().toISOString().slice(0, 10)}.json"`)
        return json(res, 200, { schemaVersion: 1, exportedAt: new Date().toISOString(), ...store.adminCatalog() })
      }
      const statusMatch = path.match(/^\/api\/admin\/records\/([^/]+)\/status$/)
      if (statusMatch && req.method === 'PATCH') return json(res, 200, { item: store.setRecordStatus(decodeURIComponent(statusMatch[1]), await readBody(req)) })
      const match = path.match(/^\/api\/admin\/(records|categories|groups)(?:\/([^/]+))?$/)
      if (match && ((req.method === 'POST' && !match[2]) || (req.method === 'PATCH' && match[2]))) {
        const input = await readBody(req), id = match[2] ? decodeURIComponent(match[2]) : null
        const result = { records: store.saveRecord, categories: store.saveCategory, groups: store.saveGroup }[match[1]](id, input)
        return json(res, id ? 200 : 201, { item: result })
      }
      throw new HttpError(404, '接口不存在')
    } catch (error) {
      if (!error.status) console.error('API error:', error)
      if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : '保存服务暂时不可用，请稍后重试' })
    }
  }
  return { handler, store, close: store.close }
}
