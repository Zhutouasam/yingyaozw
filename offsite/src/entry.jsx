import { homeTitle, homeDescription } from '../shared/public-content.mjs'
import './theme.css'
import './entry.css'

const root = document.getElementById('root')
const status = (message, retry = false, notFound = false) => {
  const section = document.createElement('main')
  section.className = 'startup-status'
  section.setAttribute('role', 'status')
  const logo = document.createElement('img')
  logo.src = '/assets/yingyao-logo-nav.jpg'
  logo.alt = '荧耀站外'
  const text = document.createElement('p')
  text.textContent = message
  section.append(logo, text)
  if (notFound) {
    const title = document.createElement('h1')
    title.textContent = '页面未找到'
    section.insertBefore(title, text)
  }
  if (retry || notFound) {
    const actions = document.createElement('div')
    actions.className = 'startup-actions'
    if (retry) {
      const button = document.createElement('button')
      button.textContent = '重新加载'
      button.onclick = () => location.reload()
      actions.append(button)
    }
    const home = document.createElement('a')
    home.href = '/'
    home.textContent = '返回首页'
    actions.append(home)
    section.append(actions)
  }
  root.replaceChildren(section)
}
if (!root.querySelector('.home-shell, .public-page') && !root[Symbol.for('yingyao.react-root')]) status('正在加载…')
const descriptions = {
  home: homeDescription,
  quote: '荧耀站外全球渠道报价中心，查询推广渠道、参考报价、合作要求与交付时效。',
  admin: '荧耀站外报价内容管理后台。'
}
if (location.pathname === '/' && location.hash === '#catalog') {
  location.replace(`/quote${location.hash}`)
} else if (location.pathname === '/admin' || location.pathname === '/admin/') {
  document.title = '荧耀站外 · 报价管理后台'
  document.querySelector('meta[name="description"]').content = descriptions.admin
  import('./admin.jsx').catch(() => status('管理页面暂时无法加载，请重试。', true))
} else if (location.pathname === '/quote' || location.pathname === '/quote/') {
  document.title = '荧耀站外｜跨境电商推广渠道与报价'
  document.querySelector('meta[name="description"]').content = descriptions.quote
  fetch('/api/catalog', { cache: 'no-store' })
    .then(async (response) => {
      if (!response.ok) throw new Error('Catalog unavailable')
      window.SNOW123_PRICING = await response.json()
      await import('./catalog.jsx')
    })
    .catch(() => {
      if (root.querySelector('.public-page')) {
        const notice = document.createElement('p')
        notice.setAttribute('role', 'status')
        notice.textContent = '实时报价暂时无法连接，请稍后刷新；下方服务说明仍可查看。'
        root.prepend(notice)
      } else status('报价服务暂时无法连接，请稍后重试。', true)
    })
} else if (location.pathname === '/') {
  document.title = homeTitle
  document.querySelector('meta[name="description"]').content = descriptions.home
  import('./home-entry.jsx').catch(() => {
    if (!root.querySelector('.home-shell, .public-page')) status('主页暂时无法加载，请重试。', true)
  })
} else {
  document.title = '页面未找到 · 荧耀站外'
  status('这个页面不存在，请返回网站首页。', false, true)
}
