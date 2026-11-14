import { brand, company, servicePages, servicePath, procurementFaqs } from './public-content.mjs'

export function resolveOrigin(value = 'https://yingyaozw.com') {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw new Error('PUBLIC_ORIGIN 须为有效的站点根域名')
  }
  return url.origin
}
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[character])

export function structuredData(origin, page, { path = '/', title = brand, faqs: explicitFaqs } = {}) {
  const graph = [
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: company, url: `${origin}/`,
      brand: { '@type': 'Brand', name: brand, alternateName: 'YINGYAO OFFSITE' } },
    { '@type': 'WebSite', '@id': `${origin}/#website`, name: brand, url: `${origin}/`,
      inLanguage: 'zh-CN', publisher: { '@id': `${origin}/#organization` } }
  ]
  if (page) graph.push({ '@type': 'Service', '@id': `${origin}${servicePath(page)}#service`,
    name: page.title, description: page.description, url: `${origin}${servicePath(page)}`,
    provider: { '@id': `${origin}/#organization` } })
  const url = origin + path
  graph.push({ '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title,
    inLanguage: 'zh-CN', isPartOf: { '@id': `${origin}/#website` },
    about: { '@id': page ? `${url}#service` : `${origin}/#organization` } })
  if (page) graph.push({ '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: [
    { '@type': 'ListItem', position: 1, name: '首页', item: `${origin}/` },
    { '@type': 'ListItem', position: 2, name: page.title, item: url }
  ] })
  const faqs = explicitFaqs ?? (page ? [[page.question, page.answer]] : path === '/' ? procurementFaqs : [])
  if (faqs.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: faqs.map(([question, answer]) => ({
    '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer }
  })) })
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c')
}
export function decorateDocument(html, { origin, path, title, description, page, faqs }) {
  const canonical = escapeHtml(origin + path)
  let output = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
  for (const [attribute, key, value] of [
    ['name', 'description', description], ['property', 'og:title', title],
    ['property', 'og:description', description], ['property', 'og:image', `${origin}/assets/yingyao-logo.jpg`]
  ]) {
    const pattern = new RegExp(`<meta ${attribute}="${key}" content="[^"]*"\\s*\\/?>`)
    output = output.replace(pattern, `<meta ${attribute}="${key}" content="${escapeHtml(value)}">`)
  }
  const markdown = path === '/' ? '/index.md' : path === '/quote' ? '/quote.md' : `${path}index.md`
  output = output.replace('</head>', `<link rel="alternate" type="text/markdown" href="${escapeHtml(origin + markdown)}" title="Markdown">\n<link rel="help" href="${origin}/llms.txt" title="站点阅读目录">\n</head>`)
  return output.replace('</head>', `<link rel="canonical" href="${canonical}">\n<meta property="og:url" content="${canonical}">\n<script type="application/ld+json">${structuredData(origin, page, { path, title, faqs })}</script>\n</head>`)
}
export function publicPageBody(page) {
  const title = page?.title || '跨境电商推广渠道与报价说明'
  const intro = page?.description || '按目标市场和产品品类比较推广渠道、合作条件与参考报价。最终费用及排期以执行前确认为准。'
  const sections = publicSections(page)
  return `<div class="public-page"><header><a class="public-brand" href="/">${brand}</a><nav aria-label="网站导航"><a href="/#services">服务</a><a href="/quote">渠道报价</a><a href="/buyer-qa/">买家问答</a><a href="/#cooperation">合作咨询</a></nav></header>
<main><nav aria-label="当前位置"><a href="/">首页</a> / ${escapeHtml(title)}</nav><h1>${escapeHtml(title)}</h1><p class="public-intro">${escapeHtml(intro)}</p><p>${brand}由${company}运营。</p>
${sections.map(([heading, text]) => `<section><h2>${escapeHtml(heading)}</h2><p>${escapeHtml(text)}</p></section>`).join('\n')}
<section><h2>买家问答</h2><p><a href="/buyer-qa/${page ? `#${page.slug}` : ''}">查看${page ? escapeHtml(page.title) : '站外推广'}相关的选型、费用与交付问答</a></p></section>
<section><h2>了解相关服务</h2><ul>${servicePages.map(item => `<li><a href="${servicePath(item)}">${escapeHtml(item.title)}</a></li>`).join('')}</ul></section>
<section><h2>沟通产品需求</h2><p>提供产品链接、目标市场、预算与时间，通过首页合作咨询入口沟通具体方案。</p><a class="public-action" href="${page ? `/quote?category=${page.category}` : '/#cooperation'}">${page ? '查看渠道与参考报价' : '前往合作咨询'}</a></section>
</main><footer>${company} · ${brand}<p>参考报价、渠道可用性与合作条件，以执行前确认为准。</p></footer></div>`
}
export function publicSections(page) {
  return page ? [
    ['适合谁', page.audience], ['服务内容与交付', page.delivery],
    ['询价前需要准备什么', page.preparation], ['合作前确认费用与排期', '费用受渠道、市场、内容形式、排期及合作条件影响。确认产品与受众匹配后，再逐项确认费用、交付范围和排期。'],
    [page.question, page.answer], ['服务边界', page.limitation]
  ] : [
    ['站外推广', '根据产品品类和市场比较海外群组、Deal网站及博主渠道，核对折扣、发布门槛和排期。'],
    ['红人视频、PR媒体与亚马逊周边', '查看影响者视频、新闻稿、周边服务与运营工具的适用条件及交付说明。'],
    ['费用如何确认', '询价时提供产品链接、品类、市场、预算和上线时间。寄样、产品折扣及素材使用等费用须逐项确认，不能默认包含。']
  ]
}

export function buyerQaBody(entries) {
  return `<div class="public-page"><header><a class="public-brand" href="/">${brand}</a><nav aria-label="网站导航"><a href="/#services">服务</a><a href="/quote">渠道报价</a><a href="/#cooperation">合作咨询</a></nav></header>
<main><nav aria-label="当前位置"><a href="/">首页</a> / 买家问答</nav><h1>站外推广买家问答</h1><p class="public-intro">从渠道选择、费用比较到交付验收，了解合作前需要确认的 24 个问题。</p><p>${brand}由${company}运营。</p>
<nav aria-label="问答分类"><ul>${servicePages.map(page => `<li><a href="#${page.slug}">${escapeHtml(page.title)}</a></li>`).join('')}</ul></nav>
${servicePages.map(page => `<section id="${page.slug}"><h2>${escapeHtml(page.title)}</h2><p><a href="${servicePath(page)}">了解服务内容与合作要求</a></p>${entries.filter(entry => entry.slug === page.slug).map(entry => `<article id="${entry.id}"><h3>${escapeHtml(entry.question)}</h3><p>${escapeHtml(entry.answer)}</p><p><a href="${servicePath(page)}">相关服务：${escapeHtml(page.title)}</a></p></article>`).join('')}</section>`).join('')}
<section><h2>沟通具体需求</h2><p>费用、渠道和排期以执行前确认为准。</p><a class="public-action" href="/#cooperation">前往合作咨询</a></section></main><footer>${company} · ${brand}</footer></div>`
}
