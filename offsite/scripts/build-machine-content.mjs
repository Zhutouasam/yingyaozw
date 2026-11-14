import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { brand, company, homeDescription, procurementFaqs, servicePages, servicePath } from '../shared/public-content.mjs'
import { publicSections } from '../shared/public-document.mjs'

export async function buildMachineContent(dist, origin, buyerQa) {
  const services = servicePages.map(page => `- [${page.title}](${origin}${servicePath(page)}): ${page.description}`)
  const home = `# ${brand}\n\n${homeDescription}\n\n公司主体：${company}\n\n## 服务\n\n${services.join('\n')}\n\n` +
    procurementFaqs.map(([q, a]) => `## ${q}\n\n${a}\n`).join('\n')
  const documents = [{ path: '/buyer-qa/', file: 'buyer-qa/index.md', text: `# 站外推广买家问答\n\n${company} · ${brand}\n\n` + buyerQa.map(entry => `## ${entry.question}\n\n${entry.answer}\n\n相关服务：${origin}/services/${entry.slug}/\n`).join('\n') }, { path: '/', file: 'index.md', text: home }, {
    path: '/quote', file: 'quote.md', text: '# 跨境电商推广渠道与报价说明\n\n' +
      `${brand}由${company}运营。\n\n` + publicSections().map(([h, t]) => `## ${h}\n\n${t}\n`).join('\n') +
      `\n实时报价与可用渠道请访问 ${origin}/quote ，本文不复制可能变化的价格。\n`
  }, ...servicePages.map(page => ({ path: servicePath(page), file: `services/${page.slug}/index.md`,
    text: `# ${page.title}\n\n${page.description}\n\n${brand}由${company}运营。\n\n` +
      publicSections(page).map(([h, t]) => `## ${h}\n\n${t}\n`).join('\n') }))]
  for (const document of documents) {
    await writeFile(resolve(dist, document.file), document.text +
      `\n网页原文：${origin}${document.path}\n\n合作咨询：${origin}/#cooperation\n`)
  }
  const markdownLinks = documents.map(document => `- [${document.path}](${origin}/${document.file})`)
  await writeFile(resolve(dist, 'llms.txt'), `# ${brand}\n\n> ${homeDescription}\n\n公司主体：${company}\n\n## 官网入口\n\n` +
    `- [首页](${origin}/)\n- [买家问答](${origin}/buyer-qa/)\n- [渠道与参考报价](${origin}/quote)\n${services.join('\n')}\n\n## Markdown 阅读版本\n\n${markdownLinks.join('\n')}\n\n` +
    '## 信息说明\n\n服务范围以对应网页为准；费用、渠道和排期需执行前确认。Markdown 与网页共享内容来源。\n')
}
