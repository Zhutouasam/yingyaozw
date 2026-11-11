import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, LayoutGrid, Menu, Plus, Search, ShieldCheck, ShoppingBag, Trash2, X } from 'lucide-react'
import './styles.css'

const clean = value => String(value || '').replace(/\s+/g, ' ').trim()
const normalizePrice = (value, currency = 'CNY') => {
  const raw = clean(value)
  if (!raw || raw === '—') return '价格待确认'
  if (raw === '0') return '免费'
  if (!/\d/.test(raw) || /折/.test(raw)) return raw
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '¥'
  let body = raw.replace(/人民币|RMB|CNY|美元|美金|USD|欧元|EUR|元/ig, '').trim()
  body = body.replace(/\d[\d,]*/g, digits => Number(digits.replaceAll(',', '')).toLocaleString('zh-CN'))
  return `${symbol}${body}`
}
const numberPrice = value => Number(String(value).replaceAll(',', '').match(/[\d.]+/)?.[0] || 0)
const toneAt = index => ['gold', 'green', 'ink'][index % 3]
const source = window.SNOW123_PRICING || { groups: [], categoryMeta: [], categories: {} }
const kickerMap = { promotion: '站外推广', video: '红人视频', media: 'PR 媒体', amazon: '亚马逊周边' }
const metaById = Object.fromEntries(source.categoryMeta.map(item => [item.id, item]))
const existingIds = Object.keys(source.categories)
const categoryOrder = [
  ...source.groups.flatMap(group => source.categoryMeta
    .filter(item => item.group_id === group.id && item.is_visible && existingIds.includes(item.id))
    .sort((a, b) => a.sort_order - b.sort_order)
    .map(item => item.id)),
  ...existingIds.filter(id => !source.categoryMeta.some(item => item.id === id))
]
const tabMeta = Object.fromEntries(categoryOrder.map(id => {
  const meta = metaById[id] || {}
  const group = source.groups.find(item => item.id === meta.group_id)
  return [id, [meta.label || id, kickerMap[meta.group_id] || group?.title?.toUpperCase() || 'GLOBAL SERVICES']]
}))

function createCatalog() {
  return categoryOrder.flatMap(tab => (source.categories[tab] || []).map((record, index) => ({
    id: String(record.id || `${tab}-${index}`), tab, name: clean(record.name) || `${tabMeta[tab][0]}服务`,
    type: clean(record.category) || clean(record.form) || tabMeta[tab][0],
    market: clean(record.platform) || tabMeta[tab][0], platform: clean(record.form) || clean(record.platform) || '详情确认',
    delivery: clean(record.time) || '排期确认', traffic: clean(record.traffic),
    priceRaw: clean(record.price), priceText: normalizePrice(record.price, record.currency), priceValue: numberPrice(record.price),
    currency: clean(record.currency) || 'CNY', desc: clean(record.desc) || '具体要求与交付内容请查看详情。',
    requirements: clean(record.desc), url: clean(record.url), sampleUrl: clean(record.sample_url),
    badge: clean(record.form) || clean(record.category) || '渠道服务', tone: toneAt(index)
  })))
}

const channels = createCatalog()
const counts = Object.fromEntries(Object.keys(tabMeta).map(id => [id, channels.filter(item => item.tab === id).length]))
const groups = source.groups.map(group => ({
  title: group.title,
  items: categoryOrder.filter(id => metaById[id]?.group_id === group.id)
})).filter(group => group.items.length)
const ungrouped = categoryOrder.filter(id => !groups.some(group => group.items.includes(id)))
if (ungrouped.length) groups.push({ title: '其他服务', items: ungrouped })

function Logo() {
  return <div className="brand"><img className="brand-logo" src="/assets/yingyao-logo.jpg" alt="荧耀站外"/><span><strong>荧耀站外</strong><small>YINGYAO OFFSITE</small></span></div>
}

function Sidebar({ active, setActive, open, onClose }) {
  return <><div className={`mobile-shade ${open ? 'show' : ''}`} onClick={onClose}></div><aside className={`sidebar ${open ? 'open' : ''}`}>
    <div className="sidebar-brand"><Logo/><button className="icon-btn mobile-close" onClick={onClose} aria-label="关闭菜单"><X size={18}/></button></div>
    <nav className="primary-nav" aria-label="主要功能"><button className="active"><LayoutGrid size={17}/><span>渠道报价中心</span></button></nav>
    <div className="channel-nav">{groups.map(group => <div className="nav-section" key={group.title}><p>{group.title}</p>{group.items.map(id => <button key={id} className={active === id ? 'selected' : ''} onClick={() => { setActive(id); onClose() }}><span>{tabMeta[id][0]}</span><em>{counts[id]}</em></button>)}</div>)}</div>
  </aside></>
}

function CategoryBoard({ active, setActive }) {
  return <nav className="category-board" aria-label="报价分类">
    <div className="category-mobile">{categoryOrder.map(id => <button key={id} className={active === id ? 'selected' : ''} onClick={() => setActive(id)}><span>{tabMeta[id][0]}</span><em>{counts[id]}</em></button>)}</div>
    <div className="category-desktop">
      <header className="category-board-head"><strong>渠道</strong></header>
      <div className="category-list">{categoryOrder.map(id => <button key={id} className={active === id ? 'selected' : ''} onClick={() => setActive(id)}><span>{tabMeta[id][0]}</span><em>{counts[id]}</em></button>)}</div>
    </div>
  </nav>
}

function ChannelCard({ item, inCart, onAdd, onDetail }) {
  return <article className="service-card">
    <div className="service-main"><div className="service-title"><span>{item.type}</span><button onClick={() => onDetail(item)}>{item.name}<ArrowUpRight size={14}/></button>{item.traffic && <small>月流量 {item.traffic}</small>}</div><div className="service-price"><strong>{item.priceText}</strong><span>{/\d/.test(item.priceRaw) ? item.currency : '按需确认'}</span></div></div>
    <button className="service-summary" title={item.desc} onClick={() => onDetail(item)}>{item.desc}</button>
    <div className="service-facts"><span><small>适用市场</small><strong>{item.market}</strong><em>{item.platform}</em></span><span><small>交付时效</small><strong><Clock3 size={13}/>{item.delivery}</strong></span></div>
    <div className="service-actions"><button className="detail-link" onClick={() => onDetail(item)}>查看详情 <ArrowUpRight size={14}/></button><button className={inCart ? 'row-add added' : 'row-add'} onClick={() => onAdd(item)} aria-label={`${inCart ? '已加入' : '加入报价'} ${item.name}`}>{inCart ? <Check size={16}/> : <Plus size={16}/>}<span>{inCart ? '已加入' : '加入报价'}</span></button></div>
  </article>
}

function CartDrawer({ open, cart, onClose, remove, clear, onQuote }) {
  return <><div className={`drawer-shade ${open ? 'show' : ''}`} onClick={onClose}></div><aside className={`cart-drawer ${open ? 'open' : ''}`}>
    <header><div><span>已选服务</span><h2>当前询价单</h2><p>{cart.length} 项服务已选择</p></div><button className="icon-btn" onClick={onClose} aria-label="关闭询价单"><X size={19}/></button></header>
    <div className="cart-body">{cart.length === 0 ? <div className="empty-cart"><ShoppingBag size={38}/><h3>询价单还是空的</h3><p>选择感兴趣的渠道，我们会整理排期、要求和正式报价。</p></div> : cart.map(item => <div className="cart-item" key={item.id}><div><span>{item.type} · {item.market}</span><strong>{item.name}</strong><em>{item.priceText}</em></div><button onClick={() => remove(item.id)} aria-label={`移除${item.name}`}><Trash2 size={16}/></button></div>)}</div>
    <footer><div className="total"><span>报价说明<small>包含多币种、区间价与套餐价，请以各项明细为准</small></span><strong>{cart.length ? `${cart.length} 项` : '—'}</strong></div><button className="quote-btn" disabled={!cart.length} onClick={onQuote}>提交需求，获取正式报价 <ArrowUpRight size={17}/></button>{cart.length > 0 && <button className="clear-btn" onClick={clear}>清空全部</button>}</footer>
  </aside></>
}

function DetailModal({ item, onClose, onAdd, inCart }) {
  if (!item) return null
  return <div className="modal-layer" role="dialog" aria-modal="true" onClick={onClose}><div className="detail-modal" onClick={event => event.stopPropagation()}>
    <button className="icon-btn modal-close" onClick={onClose} aria-label="关闭详情"><X size={19}/></button><span className={`tag ${item.tone}`}>{item.badge}</span><h2>{item.name}</h2><p className="modal-lead">{item.desc}</p>
    <div className="detail-grid"><div><span>覆盖市场</span><strong>{item.market}</strong></div><div><span>适用平台</span><strong>{item.platform}</strong></div><div><span>预计交付</span><strong>{item.delivery}</strong></div><div><span>服务类型</span><strong>{item.type}</strong></div></div>
    {(item.url && item.url !== '—' || item.sampleUrl) && <div className="resource-links">{item.url && item.url !== '—' && <a href={item.url} target="_blank" rel="noreferrer">访问渠道 <ArrowUpRight size={15}/></a>}{item.sampleUrl && <a href={item.sampleUrl} target="_blank" rel="noreferrer">查看案例 <ArrowUpRight size={15}/></a>}</div>}
    {item.requirements && <div className="requirements"><span>服务要求</span><p>{item.requirements}</p></div>}
    <div className="assurance"><ShieldCheck size={22}/><div><strong>荧耀交付保障</strong><p>专属顾问全程跟进，完成后回传发布链接、截图及可获取的数据报告。</p></div></div>
    <div className="modal-action"><div className="price"><small>服务报价</small><strong>{item.priceText}</strong></div><button className={inCart ? 'add-btn added' : 'add-btn'} onClick={() => onAdd(item)}>{inCart ? <><Check size={16}/>已加入询价</> : <><Plus size={16}/>加入报价</>}</button></div>
  </div></div>
}

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null
  return <nav className="pagination" aria-label="报价分页"><button disabled={current === 1} onClick={() => onChange(current - 1)} aria-label="上一页"><ArrowLeft size={15}/></button><span>第 <strong>{current}</strong> / {total} 页</span><button disabled={current === total} onClick={() => onChange(current + 1)} aria-label="下一页"><ArrowRight size={15}/></button></nav>
}

function App() {
  const [active, setActiveState] = useState(categoryOrder[0] || 'us')
  const [filter, setFilter] = useState('全部')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('推荐排序')
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [toast, setToast] = useState('')
  const pageSize = 12
  const setActive = id => { setActiveState(id); setSearch(''); setFilter('全部'); setPage(1); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const categoryTypes = useMemo(() => [...new Set(channels.filter(item => item.tab === active).map(item => item.type))], [active])
  const filtered = useMemo(() => {
    let list = search.trim() ? channels : channels.filter(item => item.tab === active)
    if (filter !== '全部') list = list.filter(item => item.type === filter)
    if (search.trim()) { const q = search.toLowerCase(); list = list.filter(item => `${item.name}${item.desc}${item.market}${item.type}${item.platform}${item.priceText}`.toLowerCase().includes(q)) }
    const isSortable = item => /\d/.test(item.priceRaw) && !/折/.test(item.priceRaw)
    if (sort === '价格从低到高') list = [...list].sort((a,b) => (isSortable(a) ? a.priceValue : Infinity) - (isSortable(b) ? b.priceValue : Infinity))
    if (sort === '价格从高到低') list = [...list].sort((a,b) => isSortable(a) && isSortable(b) ? b.priceValue - a.priceValue : isSortable(a) ? -1 : 1)
    return list
  }, [active, filter, search, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => { if (page > pageCount) setPage(pageCount) }, [page, pageCount])
  useEffect(() => {
    const isOverlayOpen = Boolean(detail || cartOpen || menuOpen)
    document.body.style.overflow = isOverlayOpen ? 'hidden' : ''
    const closeOverlay = event => {
      if (event.key !== 'Escape') return
      setDetail(null); setCartOpen(false); setMenuOpen(false)
    }
    window.addEventListener('keydown', closeOverlay)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', closeOverlay) }
  }, [detail, cartOpen, menuOpen])
  const add = item => { if (cart.some(x => x.id === item.id)) { setCartOpen(true); return } setCart([...cart, item]); setToast(`已将「${item.name}」加入询价单`); setTimeout(() => setToast(''), 2400) }
  const quote = () => { setCartOpen(false); setToast('需求已整理，可交由顾问继续确认'); setTimeout(() => setToast(''), 3600) }
  const label = tabMeta[active][0]

  return <div className="app-shell"><Sidebar active={active} setActive={setActive} open={menuOpen} onClose={() => setMenuOpen(false)}/><main className="workspace">
    <header className="topbar"><div className="desktop-brand"><Logo/></div><div className="mobile-brand"><Logo/></div><nav className="breadcrumb" aria-label="主导航"><span>业务介绍</span><strong>价格表</strong><span>站外监测</span><span>站外分析</span></nav><div className="top-actions"><div className="live-status"><i></i>报价已同步</div><button className="cart-button" aria-label={`打开询价单，当前 ${cart.length} 项`} onClick={() => setCartOpen(true)}><ShoppingBag size={17}/><span>询价单</span><em>{cart.length}</em></button><button className="icon-btn mobile-menu-button" aria-label="打开菜单" onClick={() => setMenuOpen(true)}><Menu size={20}/></button></div></header>
    <div className="content"><section className="command-head"><div><span>价格表</span><h1>每个渠道，一个价</h1><p>按区域、渠道与关键词筛选。公开价格、服务要求和交付时间，一次看清。</p></div></section>
      <div className="catalog-layout"><CategoryBoard active={active} setActive={setActive}/><section className="quote-workspace">
        <section className="toolbar"><label className="search"><Search size={18}/><input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder={`搜索 ${channels.length} 条报价、渠道或市场`}/>{search && <button onClick={() => setSearch('')} aria-label="清除搜索"><X size={15}/></button>}</label><div className="select-wrap"><select value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}><option>推荐排序</option><option>价格从低到高</option><option>价格从高到低</option></select><ChevronDown size={15}/></div></section>
        <section className="trust-note"><ShieldCheck size={16}/><span>公开参考价，执行前确认排期与最终要求</span><span className="calibrated"><Check size={13}/> 已同步</span></section>
        <div className="filter-row"><button className={filter === '全部' ? 'active' : ''} onClick={() => { setFilter('全部'); setPage(1) }}>全部资源</button>{categoryTypes.map(type => <button className={filter === type ? 'active' : ''} onClick={() => { setFilter(type); setPage(1) }} key={type}>{type}</button>)}</div>
        <div className="result-row"><div><span>{search ? '搜索结果' : label}</span><strong>{filtered.length} 项</strong></div></div>
        {visible.length ? <><section className="pricing-list view-grid" aria-label={`${label}报价明细`}>{visible.map(item => <ChannelCard key={item.id} item={item} inCart={cart.some(x => x.id === item.id)} onAdd={add} onDetail={setDetail}/>)}</section><Pagination current={page} total={pageCount} onChange={next => { setPage(next); window.scrollTo({top: 360, behavior: 'smooth'}) }}/></> : <section className="no-result"><Search size={34}/><h3>没有找到匹配的渠道</h3><p>换个关键词，或选择其他渠道分类试试。</p><button onClick={() => { setSearch(''); setFilter('全部') }}>清除筛选</button></section>}
      </section></div>
    </div><footer className="page-footer"><span>© 2026 荧耀站外 YINGYAO OFFSITE</span><span>{channels.length} 项报价 · {categoryOrder.length} 个服务分类</span><span>服务条款 · 隐私政策 · 渠道合作</span></footer>
  </main><CartDrawer open={cartOpen} cart={cart} onClose={() => setCartOpen(false)} remove={id => setCart(cart.filter(x => x.id !== id))} clear={() => setCart([])} onQuote={quote}/><DetailModal item={detail} onClose={() => setDetail(null)} onAdd={add} inCart={detail && cart.some(x => x.id === detail.id)}/>{toast && <div className="toast" role="status"><Check size={16}/>{toast}</div>}</div>
}

createRoot(document.getElementById('root')).render(<App />)
