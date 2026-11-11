import CatalogServiceInfo from './catalog-service-info.jsx'
import { company } from '../shared/public-content.mjs'
import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react'
import { mountApp } from './mount-app.jsx'
import { createPortal } from 'react-dom'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  Globe2,
  LayoutGrid,
  List,
  Menu,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X
} from 'lucide-react'
import SiteBrand from './site-brand.jsx'
import WechatDialog from './wechat-dialog.jsx'
import './catalog.css'

const clean = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
const normalizePrice = (value, currency = 'CNY') => {
  const raw = clean(value)
  if (!raw || raw === '—') return '价格待确认'
  if (raw === '0') return '免费'
  if (!/^(?:[¥$€]|人民币|RMB|CNY|美元|美金|USD|欧元|EUR)?\s*\d/i.test(raw) || /折|优惠|券|免费使用/.test(raw))
    return raw
  const symbol = { CNY: '¥', USD: '$', EUR: '€' }[currency] || `${currency} `
  const body = raw
    .replace(/人民币|RMB|CNY|美元|美金|USD|欧元|EUR|元|[¥$€]/gi, '')
    .trim()
    .replace(/\d[\d,]*(?:\.\d+)?/g, (digits) =>
      Number(digits.replaceAll(',', '')).toLocaleString('zh-CN', { maximumFractionDigits: 6 })
    )
  return `${symbol}${body}`
}
const numericPrice = (value) =>
  Number(
    String(value)
      .replaceAll(',', '')
      .match(/[\d.]+/)?.[0] || 0
  )
const isNumericPrice = (item) =>
  /^(?:[¥$€]|人民币|RMB|CNY|美元|美金|USD|欧元|EUR)?\s*\d/i.test(item.priceRaw) &&
  !/折|优惠|券|免费使用/.test(item.priceRaw)
const safeUrl = (value) => {
  if (!value || value === '—') return ''
  try {
    const url = new URL(value, 'https://quote.snow123.com/')
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
const CatalogContext = createContext(null)
function catalogModel(source) {
  const metaById = Object.fromEntries(source.categoryMeta.map((item) => [item.id, item]))
  const existingIds = Object.keys(source.categories)
  const categoryOrder = [
    ...source.groups.flatMap((group) =>
      source.categoryMeta
        .filter((item) => item.group_id === group.id && item.is_visible && existingIds.includes(item.id))
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((item) => item.id)
    ),
    ...existingIds.filter((id) => !source.categoryMeta.some((item) => item.id === id))
  ]
  const labelOf = (id) => metaById[id]?.label || id
  const channels = categoryOrder.flatMap((tab) =>
    (source.categories[tab] || []).map((record, index) => ({
      id: `${tab}:${record.id || index}`,
      tab,
      name: clean(record.name) || `${labelOf(tab)}服务`,
      type: clean(record.category) || clean(record.form) || labelOf(tab),
      market: clean(record.platform) || '待确认',
      platform: clean(record.form) || '待确认',
      delivery: clean(record.time) || '排期确认',
      traffic: clean(record.traffic),
      priceRaw: clean(record.price),
      priceText: normalizePrice(record.price, record.currency),
      priceValue: numericPrice(record.price),
      currency: clean(record.currency) || 'CNY',
      desc: String(record.desc ?? '').trim(),
      updatedAt: record.quotationUpdatedAt,
      url: safeUrl(clean(record.url)),
      sampleUrl: safeUrl(clean(record.sample_url))
    }))
  )
  const byId = new Map(channels.map((item) => [item.id, item]))
  const counts = Object.fromEntries(
    categoryOrder.map((id) => [id, channels.filter((item) => item.tab === id).length])
  )
  const groups = source.groups
    .map((group) => ({
      title: group.title,
      items: categoryOrder.filter((id) => metaById[id]?.group_id === group.id)
    }))
    .filter((group) => group.items.length)
  const ungrouped = categoryOrder.filter((id) => !groups.some((group) => group.items.includes(id)))
  if (ungrouped.length) groups.push({ title: '其他服务', items: ungrouped })
  return { categoryOrder, labelOf, channels, byId, counts, groups }
}
const storageKey = 'yingyao-inquiry-v2'
const readSaved = (byId) => {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => byId.has(id)))] : []
  } catch {
    return []
  }
}

function CatalogProvider() {
  const [source, setSource] = useState(window.SNOW123_PRICING)
  const [offline, setOffline] = useState(false)
  useEffect(() => {
    let stopped = false,
      pending = false
    const refresh = async () => {
      if (pending || document.visibilityState === 'hidden') return
      pending = true
      try {
        const response = await fetch('/api/catalog', { cache: 'no-store' })
        if (!response.ok) throw new Error()
        const next = await response.json()
        if (!stopped) {
          setSource((current) => (current.revision === next.revision ? current : next))
          setOffline(false)
        }
      } catch {
        if (!stopped) setOffline(true)
      } finally {
        pending = false
      }
    }
    const onStorage = (event) => {
      if (event.key === 'yingyao-catalog-updated') refresh()
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', refresh)
    const interval = setInterval(refresh, 30000)
    return () => {
      stopped = true
      clearInterval(interval)
      window.removeEventListener('focus', refresh)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  const model = useMemo(() => catalogModel(source), [source])
  return (
    <CatalogContext.Provider value={model}>
      {offline && (
        <p className="data-sync-note" role="status">
          暂时无法更新报价，当前显示上次加载的数据。连接恢复后会自动更新。
        </p>
      )}
      <App />
    </CatalogContext.Provider>
  )
}

function Toast({ message, overlayKey }) {
  const [target, setTarget] = useState(null)
  useEffect(() => {
    setTarget(document.querySelector('dialog[open]') || document.body)
  }, [message, overlayKey])
  return target && message
    ? createPortal(
        <div className="toast visible" role="status" aria-live="polite">
          <Check size={17} />
          <span>{message}</span>
        </div>,
        target
      )
    : null
}

// Native dialogs handle focus trapping, background inertness, and focus restoration.
function Overlay({ children, onClose, titleId, variant = 'center' }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previous
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  const containFocus = (event) => {
    if (event.key !== 'Tab') return
    const controls = [
      ...event.currentTarget.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), [tabindex="0"]'
      )
    ].filter((node) => node.getClientRects().length)
    const first = controls[0],
      last = controls.at(-1)
    if (!first) {
      event.preventDefault()
      return
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <dialog
      ref={ref}
      className={`overlay overlay-${variant}`}
      aria-labelledby={titleId}
      onKeyDown={containFocus}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="overlay-surface">{children}</div>
    </dialog>
  )
}

function Categories({ active, onChange }) {
  const { categoryOrder, groups, labelOf, counts } = useContext(CatalogContext)
  return (
    <nav className="categories" aria-label="服务分类">
      <h2 className="categories-heading">
        <span>服务目录</span>
        <small>{categoryOrder.length.toString().padStart(2, '0')}</small>
      </h2>
      {groups.map((group, index) => (
        <section className="category-group" key={group.title}>
          <h3>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {group.title}
          </h3>
          {group.items.map((id) => (
            <button
              key={id}
              aria-current={active === id ? 'page' : undefined}
              className={active === id ? 'selected' : ''}
              onClick={() => onChange(id)}
            >
              <span>{labelOf(id)}</span>
              <em>{counts[id]}</em>
            </button>
          ))}
        </section>
      ))}
      <div className="category-note">
        <Globe2 size={18} />
        <p>
          全球资源，一处看清。
          <br />
          <span>按业务分类探索适合的渠道</span>
        </p>
      </div>
    </nav>
  )
}

function ChannelCard({ item, index, inCart, onAdd, onDetail }) {
  const unavailable = /不接/.test(item.priceRaw)
  return (
    <article className={`service-card ${inCart ? 'is-selected' : ''}`}>
      <div className="service-identity">
        <span className="resource-number" aria-hidden="true">
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="service-title">
          <div className="service-title-line">
            <button onClick={() => onDetail(item)}>{item.name}</button>
            <ArrowUpRight size={14} aria-hidden="true" />
          </div>
          <div className="service-meta">
            <span>{item.type}</span>
            {item.traffic && <span>月流量 {item.traffic}</span>}
          </div>
          <p>{item.desc || '详细合作要求与排期，请在执行前确认。'}</p>
        </div>
      </div>
      <div className="service-delivery">
        <span>{item.market}</span>
        <small>
          <Clock3 size={12} />
          {item.delivery}
        </small>
      </div>
      <div
        className={`service-price ${item.priceText.length > 17 ? 'long-price' : ''} ${!isNumericPrice(item) ? 'text-price' : ''}`}
      >
        <strong>{item.priceText}</strong>
        <span>
          {isNumericPrice(item)
            ? item.currency
            : /^(FBM|FBA)/.test(item.priceRaw)
              ? `${item.currency} · 多档价`
              : '服务参考价'}
        </span>
      </div>
      <div className="service-actions">
        <button className="detail-link" onClick={() => onDetail(item)} aria-label={`查看 ${item.name} 详情`}>
          详情
          <ArrowUpRight size={13} />
        </button>
        <button
          disabled={unavailable}
          className={`row-add ${inCart ? 'added' : ''}`}
          onClick={() => onAdd(item)}
          aria-label={`${unavailable ? '暂不承接' : inCart ? '查看已选' : '加入询价单'} ${item.name}`}
          title={unavailable ? '此服务当前暂不承接' : inCart ? '已加入，查看询价单' : '加入询价单'}
        >
          {unavailable ? <X size={15} /> : inCart ? <Check size={17} /> : <Plus size={17} />}
        </button>
      </div>
    </article>
  )
}

function DetailModal({ item, onClose, onAdd, inCart }) {
  const { labelOf } = useContext(CatalogContext)
  return (
    <Overlay onClose={onClose} titleId="detail-title">
      <div className="detail-modal">
        <header className="modal-header">
          <span className="eyebrow">渠道详情 / {labelOf(item.tab)}</span>
          <button className="icon-btn" onClick={onClose} aria-label="关闭详情">
            <X size={20} />
          </button>
        </header>
        <span className="tag">{item.type}</span>
        <h2 id="detail-title">{item.name}</h2>
        <div className="detail-price">
          <strong>{item.priceText}</strong>
          <span>{isNumericPrice(item) ? item.currency : '服务参考价'}</span>
        </div>
        <div className="detail-grid">
          <div>
            <span>市场 / 平台</span>
            <strong>{item.market}</strong>
          </div>
          <div>
            <span>发布形式</span>
            <strong>{item.platform}</strong>
          </div>
          <div>
            <span>交付时效</span>
            <strong>{item.delivery}</strong>
          </div>
          <div>
            <span>月流量</span>
            <strong>{item.traffic || '暂未提供'}</strong>
          </div>
        </div>
        <section className="requirements">
          <h3>合作要求与服务说明</h3>
          <p>{item.desc || '当前渠道暂未提供详细要求，请在合作前确认适用产品、排期和交付内容。'}</p>
        </section>
        {(item.url || item.sampleUrl) && (
          <div className="resource-links">
            {item.url && (
              <a href={item.url} target="_blank" rel="noreferrer">
                访问渠道
                <ArrowUpRight size={16} />
              </a>
            )}
            {item.sampleUrl && (
              <a href={item.sampleUrl} target="_blank" rel="noreferrer">
                查看发布案例
                <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        )}
        <p className="reference-note">
          所列为参考报价；具体排期、合作要求及最终价格，以执行前确认为准。
          {item.updatedAt && (
            <span className="record-updated">
              该条更新：{new Date(item.updatedAt).toLocaleDateString('zh-CN')}
            </span>
          )}
        </p>
        <footer className="modal-action">
          <span>{inCart ? '已加入询价单' : '加入后可复制或导出明细'}</span>
          <button
            className="primary-button"
            disabled={/不接/.test(item.priceRaw)}
            onClick={() => onAdd(item)}
          >
            {inCart ? <Check size={16} /> : <Plus size={16} />}{' '}
            {/不接/.test(item.priceRaw) ? '暂不承接' : inCart ? '查看询价单' : '加入询价单'}
          </button>
        </footer>
      </div>
    </Overlay>
  )
}

function CartDrawer({ cart, onClose, remove, clear, onExport, onCopy }) {
  const { labelOf } = useContext(CatalogContext)
  const [contactOpen, setContactOpen] = useState(false)
  return (
    <Overlay variant="drawer" onClose={onClose} titleId="cart-title">
      <div className="cart-drawer">
        <header>
          <div>
            <span className="eyebrow">已选渠道</span>
            <h2 id="cart-title">
              你的询价单<span>{cart.length.toString().padStart(2, '0')}</span>
            </h2>
            <p>保存感兴趣的渠道，集中确认合作需求。</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭询价单">
            <X size={20} />
          </button>
        </header>
        <div className="cart-body">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <span className="empty-icon">
                <ShoppingBag size={32} />
              </span>
              <h3>还没有选择渠道</h3>
              <p>
                点击报价旁的「+」加入询价单。
                <br />
                你的选择会保存在当前浏览器。
              </p>
              <button className="text-button" onClick={onClose}>
                去看看渠道 <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            cart.map((item, index) => (
              <div className="cart-item" key={item.id}>
                <small>{String(index + 1).padStart(2, '0')}</small>
                <div>
                  <span>
                    {labelOf(item.tab)} · {item.currency}
                  </span>
                  <strong>{item.name}</strong>
                  <em>{item.priceText}</em>
                </div>
                <button className="icon-btn" onClick={() => remove(item.id)} aria-label={`移除 ${item.name}`}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
        <footer>
          <div className="quote-note">
            <span>逐项报价，清楚比较。</span>
            <p>包含不同币种、区间价与套餐价，按每项明细确认，不合并为总价。</p>
          </div>
          <button className="primary-button" disabled={!cart.length} onClick={onExport}>
            <Download size={17} />
            导出询价单
          </button>
          <div className="cart-footer-actions">
            <button disabled={!cart.length} onClick={onCopy}>
              <Copy size={14} />
              复制明细
            </button>
            <button disabled={!cart.length} onClick={clear}>
              清空选择
            </button>
          </div>
          <p className="local-note">询价单保存在当前浏览器，复制或导出后可用于合作沟通。</p>
          <button type="button" className="cart-consult" onClick={() => setContactOpen(true)}>
            微信联系顾问
            <ArrowUpRight size={16} />
          </button>
        </footer>
        {contactOpen && <WechatDialog onClose={() => setContactOpen(false)} />}
      </div>
    </Overlay>
  )
}

function CooperationModal({ onClose }) {
  return (
    <Overlay onClose={onClose} titleId="cooperation-title">
      <section className="cooperation-modal">
        <header className="modal-header">
          <span className="eyebrow">合作说明</span>
          <button className="icon-btn" aria-label="关闭合作说明" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <h2 id="cooperation-title">如何选择渠道与确认合作</h2>
        <p>选择渠道、整理询价单，再与顾问确认费用和排期。</p>
        <ol>
          <li>
            <span>01</span>
            <div>
              <h3>探索与筛选</h3>
              <p>按业务分类查找渠道，查看价格、合作要求和发布形式。</p>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              <h3>整理你的需求</h3>
              <p>把渠道加入询价单，导出明细后交给顾问，并补充产品链接、预算和期望时间。</p>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              <h3>确认后再执行</h3>
              <p>与顾问确认适用性、排期、最终报价和交付内容，再决定是否合作。</p>
            </div>
          </li>
        </ol>
        <button className="primary-button" onClick={onClose}>
          开始选渠道 <ArrowRight size={17} />
        </button>
      </section>
    </Overlay>
  )
}

function Pagination({ current, total, onChange, count, size }) {
  if (!count) return null
  return (
    <div className="pagination-row">
      <p>
        显示{' '}
        <strong>
          {(current - 1) * size + 1}–{Math.min(current * size, count)}
        </strong>{' '}
        项，共 {count} 项
      </p>
      <nav className="pagination" aria-label="报价分页">
        <button disabled={current === 1} onClick={() => onChange(current - 1)} aria-label="上一页">
          <ArrowLeft size={16} />
        </button>
        {Array.from({ length: total }, (_, i) => i + 1)
          .filter((n) => n === 1 || n === total || Math.abs(n - current) <= 1)
          .map((n, i, list) => (
            <React.Fragment key={n}>
              {i > 0 && n - list[i - 1] > 1 && <span>…</span>}
              <button
                className={current === n ? 'active' : ''}
                aria-current={current === n ? 'page' : undefined}
                aria-label={`第 ${n} 页`}
                onClick={() => onChange(n)}
              >
                {n}
              </button>
            </React.Fragment>
          ))}
        <button disabled={current === total} onClick={() => onChange(current + 1)} aria-label="下一页">
          <ArrowRight size={16} />
        </button>
      </nav>
    </div>
  )
}

function App() {
  const { categoryOrder, labelOf, channels, byId, groups } = useContext(CatalogContext)
  const [active, setActive] = useState(() => {
    const requested = new URLSearchParams(location.search).get('category')
    return categoryOrder.includes(requested) ? requested : categoryOrder[0] || ''
  })
  const [filter, setFilter] = useState('全部'),
    [currency, setCurrency] = useState('全部')
  const [search, setSearch] = useState(''),
    [sort, setSort] = useState('default'),
    [view, setView] = useState('list'),
    [page, setPage] = useState(1)
  const [cartIds, setCartIds] = useState(() => readSaved(byId)),
    [cartOpen, setCartOpen] = useState(false),
    [menuOpen, setMenuOpen] = useState(false),
    [cooperationOpen, setCooperationOpen] = useState(false)
  const [detail, setDetail] = useState(null),
    [toast, setToast] = useState('')
  const searchRef = useRef(null),
    resultsRef = useRef(null),
    toastTimer = useRef(null)
  const pageSize = 10
  const cart = cartIds.map((id) => byId.get(id)).filter(Boolean)
  const showToast = (message) => {
    clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(''), 3000)
  }
  useEffect(() => () => clearTimeout(toastTimer.current), [])
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cartIds))
    } catch {
      /* Selection still works when browser storage is unavailable. */
    }
  }, [cartIds])
  useEffect(() => {
    const shortcut = (event) => {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        !detail &&
        !cartOpen &&
        !menuOpen &&
        !cooperationOpen
      ) {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [detail, cartOpen, menuOpen, cooperationOpen])
  const resetCategory = (id) => {
    setActive(id)
    setSearch('')
    setFilter('全部')
    setCurrency('全部')
    setSort('default')
    setPage(1)
    setMenuOpen(false)
  }
  const changeCategory = (id) => {
    const url = new URL(location.href)
    url.searchParams.set('category', id)
    if (url.href !== location.href) history.pushState(null, '', url)
    resetCategory(id)
  }
  useEffect(() => {
    const restoreCategory = () => {
      const requested = new URLSearchParams(location.search).get('category')
      resetCategory(categoryOrder.includes(requested) ? requested : categoryOrder[0] || '')
    }
    window.addEventListener('popstate', restoreCategory)
    return () => window.removeEventListener('popstate', restoreCategory)
  }, [categoryOrder])
  useEffect(() => {
    if (!categoryOrder.includes(active)) changeCategory(categoryOrder[0] || '')
  }, [categoryOrder, active])
  useEffect(() => {
    setDetail((current) => (current ? byId.get(current.id) || null : null))
    setCartIds((ids) => (ids.every((id) => byId.has(id)) ? ids : ids.filter((id) => byId.has(id))))
  }, [byId])
  const baseList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? channels.filter((item) =>
          `${item.name} ${item.desc} ${item.market} ${item.type} ${item.platform} ${item.priceText} ${labelOf(item.tab)}`
            .toLowerCase()
            .includes(q)
        )
      : channels.filter((item) => item.tab === active)
  }, [active, search, channels, labelOf])
  const categoryTypes = useMemo(() => [...new Set(baseList.map((item) => item.type))], [baseList])
  const currencies = useMemo(() => [...new Set(baseList.map((item) => item.currency))], [baseList])
  useEffect(() => {
    if (filter !== '全部' && !categoryTypes.includes(filter)) {
      setFilter('全部')
      setPage(1)
    }
    if (currency !== '全部' && !currencies.includes(currency)) {
      setCurrency('全部')
      setPage(1)
    }
  }, [categoryTypes, currencies, filter, currency])
  const filtered = useMemo(() => {
    let list = baseList.filter(
      (item) =>
        (filter === '全部' || item.type === filter) && (currency === '全部' || item.currency === currency)
    )
    if (sort !== 'default')
      list = [...list].sort((a, b) => {
        // Compare prices within each currency, rather than treating yuan and dollars as equivalent.
        const currencyOrder = a.currency.localeCompare(b.currency)
        if (currencyOrder) return currencyOrder
        if (isNumericPrice(a) !== isNumericPrice(b)) return isNumericPrice(a) ? -1 : 1
        if (!isNumericPrice(a)) return 0
        return sort === 'low' ? a.priceValue - b.priceValue : b.priceValue - a.priceValue
      })
    return list
  }, [baseList, filter, currency, sort])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])
  const add = (item) => {
    if (/不接/.test(item.priceRaw)) {
      showToast('此服务当前暂不承接，请选择其他渠道')
      return
    }
    if (cartIds.includes(item.id)) {
      setDetail(null)
      setCartOpen(true)
      return
    }
    setCartIds((ids) => [...ids, item.id])
    showToast(`已加入询价单 · ${item.name}`)
  }
  const inquiryText = () =>
    [
      '荧耀站外 · 渠道询价单',
      `整理日期：${new Date().toLocaleDateString('zh-CN')}`,
      `已选服务：${cart.length} 项`,
      '',
      ...cart.flatMap((item, index) => [
        `${index + 1}. ${item.name}`,
        `分类：${labelOf(item.tab)} / ${item.type}`,
        `参考报价：${item.priceText} (${item.currency})`,
        `市场 / 平台：${item.market}`,
        `发布形式：${item.platform}`,
        `交付时效：${item.delivery}`,
        `服务要求：${item.desc || '待确认'}`,
        ...(item.url ? [`渠道链接：${item.url}`] : []),
        ...(item.sampleUrl ? [`案例链接：${item.sampleUrl}`] : []),
        ''
      ]),
      '产品链接：',
      '推广预算：',
      '期望发布时间：',
      '其他需求：',
      '',
      '报价包含不同币种、区间价与套餐价；具体排期、要求和最终价格，以执行前确认为准。'
    ].join('\n')
  const exportQuote = () => {
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + inquiryText()], { type: 'text/plain;charset=utf-8' })
    )
    const link = document.createElement('a')
    link.href = url
    link.download = '荧耀站外-询价单.txt'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast('询价单已导出，可补充产品需求后发送给顾问')
  }
  const copyQuote = async () => {
    try {
      await navigator.clipboard.writeText(inquiryText())
      showToast('询价明细已复制')
    } catch {
      showToast('当前浏览器无法复制，请使用「导出询价单」')
    }
  }
  const resetFilters = () => {
    setSearch('')
    setFilter('全部')
    setCurrency('全部')
    setPage(1)
  }
  const setSearchValue = (value) => {
    setSearch(value)
    setFilter('全部')
    setCurrency('全部')
    setPage(1)
  }
  const scrollResults = () =>
    resultsRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
      block: 'start'
    })

  return (
    <div className="app-shell">
      <a href="#catalog" className="skip-link">
        跳转到渠道报价
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <SiteBrand className="brand-link" />
          <nav className="main-nav" aria-label="主导航">
            <a href="/">首页</a>
            <a href="/#services">服务</a>
            <a href="#catalog" aria-current="page">
              价格表
            </a>
            <a href="/#about">品牌故事</a>
            <a href="/#cooperation">如何合作</a>
          </nav>
          <div className="top-actions">
            <button
              className="cart-button"
              aria-label={`询价单 ${cart.length}，打开已选服务`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={17} />
              <span>询价单</span>
              <em>{cart.length}</em>
            </button>
            <button
              className="icon-btn mobile-menu-button"
              aria-label="打开分类菜单"
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={18} />
              <span>分类</span>
            </button>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="catalog-intro container" aria-labelledby="intro-title">
          <div className="intro-copy">
            <span className="eyebrow">
              <i />
              荧耀站外 · 全球资源目录
            </span>
            <h1 id="intro-title">
              渠道与服务<span>价格表</span>
            </h1>
            <p>按分类查找渠道，比较参考价格、发布要求和交付时间。</p>
          </div>
        </section>
        <section id="catalog" tabIndex={-1} className="catalog container" aria-label="渠道报价中心">
          <div className="catalog-sidebar">
            <Categories active={active} onChange={changeCategory} />
          </div>
          <div className="quote-workspace">
            <div className="catalog-heading">
              <div>
                <span className="eyebrow">{search.trim() ? '跨分类搜索' : groups.find((group) => group.items.includes(active))?.title || '渠道目录'}</span>
                <h2 aria-live="polite">
                  {search.trim() ? '搜索结果' : labelOf(active)}
                  <span>{filtered.length}</span>
                </h2>
              </div>
              <span className="reference-label">
                参考报价
              </span>
              <button
                className="category-switch"
                onClick={() => setMenuOpen(true)}
                aria-label="切换服务分类"
                aria-haspopup="dialog"
                aria-expanded={menuOpen}
              >
                换分类
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="toolbar">
              <label className="search">
                <Search size={18} />
                <input
                  ref={searchRef}
                  aria-label="搜索全部渠道、市场或服务"
                  value={search}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder={`搜索 ${channels.length} 条报价、渠道或市场…`}
                />
                {search ? (
                  <button onClick={() => setSearchValue('')} aria-label="清除搜索">
                    <X size={16} />
                  </button>
                ) : (
                  <kbd aria-hidden="true">⌘ K</kbd>
                )}
              </label>
              <div className="select-wrap">
                <select
                  aria-label="报价排序（同币种内比较）"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value)
                    setPage(1)
                  }}
                >
                  <option value="default">默认排序</option>
                  <option value="low">同币种 · 价格升序</option>
                  <option value="high">同币种 · 价格降序</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </div>
            <div className="filter-bar">
              <div className="filter-row" aria-label="渠道类型筛选">
                <button
                  aria-pressed={filter === '全部'}
                  className={filter === '全部' ? 'active' : ''}
                  onClick={() => {
                    setFilter('全部')
                    setPage(1)
                  }}
                >
                  全部渠道
                </button>
                {categoryTypes.length > 1 &&
                  categoryTypes.map((type) => (
                    <button
                      aria-pressed={filter === type}
                      className={filter === type ? 'active' : ''}
                      key={type}
                      onClick={() => {
                        setFilter(type)
                        setPage(1)
                      }}
                    >
                      {type}
                    </button>
                  ))}
              </div>
              <div className="view-toggle" aria-label="报价显示方式">
                <button
                  className={view === 'list' ? 'active' : ''}
                  aria-label="紧凑列表"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List size={17} />
                </button>
                <button
                  className={view === 'grid' ? 'active' : ''}
                  aria-label="卡片展示"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>
            {currencies.length > 1 && (
              <div className="currency-filter">
                <span>报价币种</span>
                {['全部', ...currencies].map((value) => (
                  <button
                    key={value}
                    aria-pressed={currency === value}
                    className={currency === value ? 'active' : ''}
                    onClick={() => {
                      setCurrency(value)
                      setPage(1)
                    }}
                  >
                    {value === '全部' ? '全部币种' : value}
                  </button>
                ))}
              </div>
            )}
            <div ref={resultsRef} className={`resource-list view-${view}`}>
              <div className="table-heading" aria-hidden="true">
                <span>渠道 / 合作要求</span>
                <span>平台 / 排期</span>
                <span>服务报价</span>
                <span>选入询价</span>
              </div>
              {visible.length ? (
                visible.map((item, index) => (
                  <ChannelCard
                    item={item}
                    index={(page - 1) * pageSize + index}
                    key={item.id}
                    inCart={cartIds.includes(item.id)}
                    onAdd={add}
                    onDetail={setDetail}
                  />
                ))
              ) : (
                <section className="no-result">
                  <Search size={30} />
                  <h3>暂时没有匹配的渠道</h3>
                  <p>试试其他关键词，或清除当前筛选。</p>
                  <button className="text-button" onClick={resetFilters}>
                    清除筛选
                    <ArrowRight size={16} />
                  </button>
                </section>
              )}
            </div>
            <Pagination
              current={page}
              total={pageCount}
              count={filtered.length}
              size={pageSize}
              onChange={(next) => {
                setPage(next)
                scrollResults()
              }}
            />
            <p className="catalog-disclaimer">
              <span>i</span>报价为参考价格，具体合作要求、排期与最终报价请在执行前确认。
            </p>
          </div>
        </section>
        <CatalogServiceInfo />
        <section className="closing-note container">
          <div>
            <span className="eyebrow">已找到合适的渠道？</span>
            <h2>
              整理询价单，<span>确认费用与排期。</span>
            </h2>
          </div>
          <button className="text-button" onClick={() => setCartOpen(true)}>
            整理我的询价单
            <ArrowUpRight size={19} />
          </button>
        </section>
      </main>
      <footer className="page-footer container">
        <SiteBrand />
        <span>© {new Date().getFullYear()} {company} · 荧耀站外</span>
        <a href="#" className="back-to-top">
          回到顶部
          <ArrowUpRight size={14} />
        </a>
      </footer>
      {menuOpen && (
        <Overlay variant="menu" onClose={() => setMenuOpen(false)} titleId="menu-title">
          <section className="mobile-menu">
            <header>
              <h2 id="menu-title">探索服务目录</h2>
              <button className="icon-btn" aria-label="关闭菜单" onClick={() => setMenuOpen(false)}>
                <X size={20} />
              </button>
            </header>
            <Categories active={active} onChange={changeCategory} />
            <button
              className="text-button"
              onClick={() => {
                setMenuOpen(false)
                setCooperationOpen(true)
              }}
            >
              了解如何合作
              <ArrowUpRight size={15} />
            </button>
          </section>
        </Overlay>
      )}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          remove={(id) => setCartIds((ids) => ids.filter((value) => value !== id))}
          clear={() => setCartIds([])}
          onExport={exportQuote}
          onCopy={copyQuote}
        />
      )}
      {detail && (
        <DetailModal
          item={detail}
          onClose={() => setDetail(null)}
          onAdd={add}
          inCart={cartIds.includes(detail.id)}
        />
      )}{' '}
      {cooperationOpen && <CooperationModal onClose={() => setCooperationOpen(false)} />}
      <Toast message={toast} overlayKey={`${cartOpen}-${menuOpen}-${cooperationOpen}-${detail?.id || ''}`} />
    </div>
  )
}

mountApp(<CatalogProvider />)
