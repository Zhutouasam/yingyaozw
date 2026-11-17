import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { backup } from 'node:sqlite'
import { openStore, projectRoot } from '../server/store.mjs'
import { validateQrImage } from '../server/qr-image.mjs'

const assetRoot = resolve(projectRoot, 'public/assets/customer-feedback-20261117')
const fail = (message) => { throw new Error(message) }
function imageData(file, limit) {
  const original = readFileSync(resolve(assetRoot, file))
  // 微信附件在 JPEG 结束标记后附带数据；仅移除附加尾部，保留原始像素编码。
  const end = original.lastIndexOf(Buffer.from([0xff, 0xd9]))
  if (end < 0) fail(`${file} 缺少 JPEG 结束标记`)
  const encoded = original.subarray(0, end + 2).toString('base64')
  return validateQrImage(`data:image/jpeg;base64,${encoded}`, fail, file, limit)
}

export function loadFeedback() {
  const entries = JSON.parse(readFileSync(new URL('./customer-feedback-20261117.json', import.meta.url)))
  return { qr: imageData('wechat-qr.jpg', 512 * 1024),
    entries: entries.map(({ file, ...entry }, index) => ({ ...entry,
      image: imageData(file, 1024 * 1024), is_visible: true, sort_order: index + 1 })) }
}

export function importFeedback(store, content = loadFeedback()) {
  const settings = store.siteSettings()
  if (settings.wechatQr !== content.qr) store.saveSiteSettings({ ...settings, wechatQr: content.qr })
  const existing = store.listCaseImages()
  for (const entry of content.entries) {
    const previous = existing.find((item) => item.title === entry.title && item.category === entry.category)
    if (previous && previous.desc === entry.desc && previous.is_visible === entry.is_visible &&
      previous.sort_order === entry.sort_order && store.caseImage(previous.id, true) === entry.image) continue
    store.saveCaseImage(previous?.id, { ...entry, ...(previous ? { version: previous.version } : {}) })
  }
  return store.publicSummary()
}

async function main() {
  const args = process.argv.slice(2)
  if (args.length !== 2 || args[0] !== '--db') fail('用法：node scripts/import-customer-feedback.mjs --db /absolute/path/pricing.sqlite')
  const dbPath = resolve(args[1]), existed = existsSync(dbPath)
  const content = loadFeedback()
  const store = openStore({ dbPath })
  try {
    if (existed) {
      const snapshot = `${dbPath}.before-feedback-${Date.now()}.sqlite`
      await backup(store.db, snapshot)
      console.log(`已备份原数据库：${snapshot}`)
    }
    const summary = importFeedback(store, content)
    console.log(`微信二维码已更新，公开案例共 ${summary.caseImages.length} 张；报价与其他首页设置保留。`)
  } finally { store.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1 })
}
