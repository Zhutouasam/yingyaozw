import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import { ArrowUpRight, Check, Send } from 'lucide-react'
import './home-contact.css'

function ContactForm({ initialContact }) {
  const [contact, setContact] = useState(initialContact),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [receipt, setReceipt] = useState(null)
  const [selected, setSelected] = useState(() => {
    try {
      const ids = JSON.parse(localStorage.getItem('yingyao-inquiry-v2') || '[]')
      return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string').slice(0, 50) : []
    } catch {
      return []
    }
  })
  const pending = useRef(false),
    request = useRef(null),
    errorRef = useRef(null)
  useEffect(() => {
    if (!contact)
      fetch('/api/home')
        .then((response) => (response.ok ? response.json() : null))
        .then((data) => data && setContact(data.contact))
        .catch(() => {})
  }, [])
  useEffect(() => {
    if (error) errorRef.current?.focus()
  }, [error])
  const submit = async (event) => {
    event.preventDefault()
    if (pending.current) return
    const form = new FormData(event.currentTarget)
    const body = Object.fromEntries(
      ['name', 'contact', 'productUrl', 'category', 'market', 'goal', 'budget', 'notes', 'website'].map(
        (key) => [key, String(form.get(key) || '')]
      )
    )
    body.consent = form.get('consent') === 'on'
    body.selectionIds = selected
    const signature = JSON.stringify(body)
    if (request.current?.signature !== signature) request.current = { signature, key: crypto.randomUUID() }
    body.requestKey = request.current.key
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20000)
      })
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('服务暂时无法连接，请稍后重试。已填写的内容会保留。')
      }
      if (!response.ok) throw new Error(result.error || '暂时未能提交，请稍后重试')
      setReceipt(result.id)
    } catch (e) {
      setError(
        e.name === 'TimeoutError'
          ? '连接超时，请重试。重复点击不会创建两份相同需求。'
          : e instanceof TypeError
            ? '网络连接失败，请检查网络后重试。已填写的内容会保留。'
            : e.message || '暂时未能提交，请重试'
      )
    } finally {
      pending.current = false
      setBusy(false)
    }
  }
  return (
    <section className="home-contact-panel" aria-labelledby="contact-title">
      <header>
        <span className="home-kicker">定制推广需求</span>
        <h2 id="contact-title">先聊产品，再谈推广。</h2>
        <p>留下品类与联系方式，便于我们了解需求、沟通方案。</p>
      </header>
      {(contact?.email || contact?.wechat) && (
        <div className="consultant-contact">
          <span>也可以直接联系顾问</span>
          {contact.email && (
            <a href={`mailto:${contact.email}`}>
              {contact.email}
              <ArrowUpRight size={14} />
            </a>
          )}
          {contact.wechat && <span>微信：{contact.wechat}</span>}
        </div>
      )}
      {receipt ? (
        <div
          className="request-success"
          role="status"
          tabIndex="-1"
          ref={(node) => node?.focus({ preventScroll: true })}
        >
          <Check size={24} />
          <h3>需求已收到</h3>
          <p>我们会根据你留下的联系方式沟通产品与方案。</p>
          <small>需求编号：{receipt.slice(0, 8).toUpperCase()}</small>
          <a className="home-text-link" href="/quote">
            继续浏览渠道报价
            <ArrowUpRight size={16} />
          </a>
        </div>
      ) : (
        <form onSubmit={submit} aria-busy={busy}>
          <div className="request-fields">
            <label htmlFor="request-name">
              你的称呼 <span>必填</span>
              <input
                id="request-name"
                name="name"
                required
                autoComplete="name"
                maxLength="80"
                placeholder="怎么称呼你"
              />
            </label>
            <label htmlFor="request-contact">
              联系方式 <span>必填</span>
              <input
                id="request-contact"
                name="contact"
                required
                maxLength="200"
                placeholder="微信、手机号或邮箱"
                autoComplete="off"
              />
            </label>
            <label htmlFor="request-category">
              产品品类 <span>必填</span>
              <input
                id="request-category"
                name="category"
                required
                maxLength="120"
                placeholder="例如：家居、户外、消费电子"
              />
            </label>
            <label htmlFor="request-url">
              产品链接 <span>选填</span>
              <input
                id="request-url"
                name="productUrl"
                type="url"
                maxLength="2000"
                placeholder="https://"
                autoComplete="url"
              />
            </label>
          </div>
          <details className="request-more">
            <summary>
              补充市场、预算与推广目标 <span>选填</span>
              <PlusMark />
            </summary>
            <div className="request-fields">
              <label htmlFor="request-market">
                目标市场
                <input id="request-market" name="market" defaultValue="美国" maxLength="120" />
              </label>
              <label htmlFor="request-goal">
                推广目标
                <select id="request-goal" name="goal">
                  <option value="">希望先沟通方案</option>
                  <option>积累订单</option>
                  <option>品牌曝光</option>
                  <option>红人内容</option>
                  <option>其他需求</option>
                </select>
              </label>
              <label htmlFor="request-budget">
                预算范围
                <input
                  id="request-budget"
                  name="budget"
                  maxLength="120"
                  placeholder="请注明币种，也可以待定"
                />
              </label>
              <label className="request-wide" htmlFor="request-notes">
                其他需求
                <textarea
                  id="request-notes"
                  name="notes"
                  rows="3"
                  maxLength="4000"
                  placeholder="期望上线时间、折扣方案或需要我们了解的产品特点"
                />
              </label>
            </div>
          </details>
          {selected.length > 0 && (
            <div className="request-selection">
              <p>
                同时提交当前浏览器已选的 {selected.length} 项渠道
                {selected.length === 50 ? '（最多 50 项）' : ''}。具体价格与排期另行确认。
              </p>
              <button type="button" onClick={() => setSelected([])}>
                这次只提交产品需求
              </button>
            </div>
          )}
          <div className="request-honeypot" aria-hidden="true">
            <label>
              Website
              <input name="website" tabIndex="-1" autoComplete="off" />
            </label>
          </div>
          <label className="request-consent">
            <input name="consent" type="checkbox" required />
            <span>我同意荧耀站外将以上需求和联系方式用于本次合作沟通。</span>
          </label>
          <p className="request-privacy">需求由荧耀站外团队接收，仅供授权人员查看；提交不代表下单或付款。</p>
          {error && (
            <p className="request-error" role="alert" tabIndex="-1" ref={errorRef}>
              {error}
            </p>
          )}
          <button className="home-primary" type="submit" disabled={busy}>
            {busy ? '正在提交…' : '提交推广需求'}
            <Send size={16} />
          </button>
        </form>
      )}
    </section>
  )
}
function PlusMark() {
  return <span aria-hidden="true">+</span>
}
const roots = new WeakMap()
export function mountContact(container, initialContact) {
  let root = roots.get(container)
  if (!root) {
    root = createRoot(container)
    roots.set(container, root)
  }
  flushSync(() => root.render(<ContactForm initialContact={initialContact} />))
}
