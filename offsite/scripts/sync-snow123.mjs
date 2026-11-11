import { mkdir, writeFile } from 'node:fs/promises'

const origin = 'https://quote.snow123.com'

const [catalogResponse, navResponse] = await Promise.all([
  fetch(`${origin}/api/catalog`),
  fetch(`${origin}/api/nav-meta`)
])

if (!catalogResponse.ok || !navResponse.ok) {
  throw new Error(`Snow123 sync failed: catalog ${catalogResponse.status}, navigation ${navResponse.status}`)
}

const catalogPayload = await catalogResponse.json()
const navPayload = await navResponse.json()
const categories = catalogPayload.categories || catalogPayload
const total = Object.values(categories).reduce((sum, items) => sum + items.length, 0)
const payload = {
  source: `${origin}/quote`,
  syncedAt: new Date().toISOString(),
  total,
  groups: navPayload.groups || [],
  categoryMeta: navPayload.categories || [],
  categories
}

await mkdir(new URL('../public/data/', import.meta.url), { recursive: true })
await writeFile(
  new URL('../public/data/snow123-pricing.js', import.meta.url),
  `window.SNOW123_PRICING = ${JSON.stringify(payload, null, 2)};\n`
)

console.log(`Synced ${total} records across ${Object.keys(categories).length} categories.`)
