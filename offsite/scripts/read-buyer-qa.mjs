import { readFileSync } from 'node:fs'

// Parse quoted CSV, including escaped quotes, commas and multiline fields.
export function readBuyerQa() {
  const csv = readFileSync(new URL('../docs/GEO-BUYER-QA.csv', import.meta.url), 'utf8').replace(/^\uFEFF/, '')
  const rows = []; let row = [], field = '', quoted = false
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i]
    if (c === '"') {
      if (quoted && csv[i + 1] === '"') { field += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n')) {
      row.push(field.replace(/\r$/, '')); field = ''
      if (c === '\n') { rows.push(row); row = [] }
    } else field += c
  }
  if (quoted) throw new Error('买家问答 CSV 引号未闭合')
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row) }
  const headers = rows.shift()
  const entries = rows.filter(row => row.some(Boolean)).map(row => {
    if (row.length !== headers.length) throw new Error('买家问答 CSV 列数不一致')
    return Object.fromEntries(headers.map((key, index) => [key, row[index]]))
  }).filter(row => row.content_status === '用户已确认文案')
  if (entries.length !== 24 || new Set(entries.map(row => row.prompt_id)).size !== 24 ||
      entries.some((row, i) => row.prompt_id !== `P${String(i + 1).padStart(2, '0')}` || !row.question || !row.reference_answer)) {
    throw new Error('必须提供 P01–P24 共 24 条完整且已确认的买家问答')
  }
  return entries.map(row => ({ id: row.prompt_id, question: row.question, answer: row.reference_answer,
    slug: Number(row.prompt_id.slice(1)) <= 8 || row.prompt_id === 'P24' ? 'amazon-offsite'
      : Number(row.prompt_id.slice(1)) <= 14 ? 'facebook-groups'
      : Number(row.prompt_id.slice(1)) <= 19 ? 'influencer-video' : 'pr-media' }))
}
