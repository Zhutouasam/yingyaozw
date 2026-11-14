import { servicePages, servicePath, company } from '../shared/public-content.mjs'
import { readBuyerQa } from './read-buyer-qa.mjs'
import { escapeHtml, resolveOrigin } from '../shared/public-document.mjs'

const origin = resolveOrigin(process.argv[2])
const canonicalOrigin = resolveOrigin(process.argv[3] || origin)
const results = []
const agents = ['Mozilla/5.0', 'OAI-SearchBot/1.4', 'Claude-SearchBot/1.0', 'Googlebot/2.1']
function check({ path, agent, detail = '' }, name, passed) {
  results.push({ path, agent, name, passed, detail })
}
async function get(path, agent) {
  const response = await fetch(origin + path, {
    headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(15000)
  })
  const body = await response.text()
  check({ path, agent, detail: String(response.status) }, 'HTTP 200', response.status === 200)
  check({ path, agent }, '无禁止索引响应头', !/noindex|none|nosnippet/i.test(response.headers.get('x-robots-tag') || ''))
  return { response, body }
}
async function auditPage(path) {
  let baseline
  for (const agent of agents) {
    const { body } = await get(path, agent)
    check({ path, agent }, '无需 JS 即可读取公司正文', body.includes(company) && /<main[\s>]/.test(body))
    check({ path, agent }, '规范网址', body.includes(`rel="canonical" href="${canonicalOrigin}${path}"`))
    check({ path, agent }, '无禁止摘要元信息', !/<meta[^>]+(?:name=["']robots["'])[^>]+content=["'][^"']*(?:noindex|nosnippet|none)/i.test(body))
    try {
      const schemas = [...body.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
      check({ path, agent }, '有效公司结构化数据', schemas.some(match => JSON.parse(match[1])['@graph']?.some(item => item['@type'] === 'Organization')))
    } catch { check({ path, agent }, '有效公司结构化数据', false) }
    if (path === '/buyer-qa/') {
      const entries = readBuyerQa()
      const visible = body.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '')
      check({ path, agent }, '24 条已确认问答无需 JS 可读', entries.every(entry => visible.includes(`<h3>${escapeHtml(entry.question)}</h3>`) && visible.includes(`<p>${escapeHtml(entry.answer)}</p>`)))
      const graph = JSON.parse(body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph']
      const questions = graph.find(item => item['@type'] === 'FAQPage')?.mainEntity
      check({ path, agent }, 'FAQ 结构化数据与确认文案一致', questions?.length === 24 && entries.every((entry, i) => questions[i].name === entry.question && questions[i].acceptedAnswer.text === entry.answer))
    }
    if (baseline === undefined) baseline = body
    else check({ path, agent }, '不同请求标识返回一致正文', body === baseline)
  }
}
try {
  for (const path of ['/', '/quote', '/buyer-qa/', ...servicePages.map(servicePath)]) await auditPage(path)
  for (const path of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/index.md', '/quote.md', '/buyer-qa/index.md',
    ...servicePages.map(page => `${servicePath(page)}index.md`)]) {
    const { response, body } = await get(path, agents[0])
    if (path.endsWith('.md')) check({ path, agent: agents[0] }, 'Markdown 正文与类型', body.includes(company) && /text\/markdown/.test(response.headers.get('content-type') || ''))
    if (path === '/robots.txt') check({ path, agent: agents[0] }, '声明站点地图', body.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`))
    if (path === '/sitemap.xml') check({ path, agent: agents[0] }, '涵盖问答网址', body.includes(canonicalOrigin + '/buyer-qa/'))
    if (path === '/sitemap.xml') check({ path, agent: agents[0] }, '涵盖服务网址', servicePages.every(page => body.includes(canonicalOrigin + servicePath(page))))
  }
} catch (error) {
  check({ path: '/', agent: '-', detail: error.message }, '请求完成', false)
}
const failures = results.filter(item => !item.passed)
console.log(JSON.stringify({ origin, canonicalOrigin, checkedAt: new Date().toISOString(),
  notice: '合成 User-Agent 请求仅检查可达性和正文，不能证明真实爬虫访问、索引、引用或推荐；robots、CDN 与日志还需人工核验。',
  checks: results.length, failures: failures.length, results }, null, 2))
process.exitCode = failures.length ? 1 : 0
