import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Save } from 'lucide-react'
import CaseImagesPanel from './admin-cases.jsx'
import useUnsavedChanges, { confirmNavigation } from './use-unsaved-changes.js'

const statusLabels = { new: '待联系', contacted: '已联系', closed: '已完成' }
export function InquiriesPanel({ request }) {
  const [items, setItems] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(''),
    [filter, setFilter] = useState('all')
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      setItems((await request('/api/admin/inquiries')).items)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [request])
  useEffect(() => {
    load()
  }, [load])
  const update = async (item, status) => {
    setSaving(item.id)
    setError('')
    try {
      const result = await request(`/api/admin/inquiries/${item.id}`, {
        method: 'PATCH',
        body: { status, version: item.version }
      })
      setItems((current) => current.map((row) => (row.id === item.id ? result.item : row)))
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving('')
    }
  }
  const visible = (items || []).filter((item) => filter === 'all' || item.status === filter)
  return (
    <section className="admin-inquiries">
      <div className="admin-tools">
        <label>
          需求状态{' '}
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">全部状态</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="admin-button" onClick={load} disabled={busy}>
          <RefreshCw size={15} />
          {busy ? '读取中…' : '刷新需求'}
        </button>
      </div>
      {error && (
        <p className="admin-notice error" role="alert">
          {error}
        </p>
      )}
      {!items ? (
        <p className="admin-loading">{busy ? '正在读取客户需求…' : '未能读取，请点击刷新重试。'}</p>
      ) : (
        <>
          <p className="admin-footnote">
            显示最近 500 份需求中的 {visible.length} 份。联系方式仅在授权后台展示，提交不代表已下单。
          </p>
          {visible.length === 0 ? (
            <div className="admin-empty">
              <h2>暂无{filter === 'all' ? '' : statusLabels[filter]}需求</h2>
              <p>前台定制需求入口已暂停，已接收的需求会保留在这里。</p>
            </div>
          ) : (
            visible.map((item) => (
              <article className="admin-inquiry-card" key={item.id}>
                <header>
                  <div>
                    <h2>
                      {item.name} <span>{item.category}</span>
                    </h2>
                    <p>
                      编号 {item.id.slice(0, 8).toUpperCase()} ·{' '}
                      {new Date(item.created_at).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <label>
                    处理状态
                    <select
                      value={item.status}
                      disabled={saving === item.id}
                      onChange={(event) => update(item, event.target.value)}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </header>
                <dl>
                  {[
                    ['联系方式', item.contact],
                    ['目标市场', item.market || '待沟通'],
                    ['推广目标', item.goal || '待沟通'],
                    ['预算范围', item.budget || '待沟通']
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                {item.productUrl && (
                  <p>
                    产品链接：
                    <a href={item.productUrl} target="_blank" rel="noreferrer">
                      {item.productUrl}
                    </a>
                  </p>
                )}
                {item.notes && <p className="inquiry-notes">{item.notes}</p>}
                {item.selections.length > 0 && (
                  <details>
                    <summary>查看 {item.selections.length} 项意向渠道</summary>
                    <ul>
                      {item.selections.map((selection, index) => (
                        <li key={index}>
                          {selection.name} · {selection.price || '待确认'} {selection.currency}
                        </li>
                      ))}
                    </ul>
                    <small>此处为提交时的参考报价，执行前需重新确认。</small>
                  </details>
                )}
              </article>
            ))
          )}
        </>
      )}
    </section>
  )
}

const contactFields = [
  ['email', '顾问邮箱', 'email', '选填，请填写可接收客户邮件的真实地址', 254],
  ['wechat', '顾问微信', 'text', '选填，请使用真实顾问账号', 80]
]
const caseFields = [
  ['caseGrowth', '增长百分比', 'text', '填写经核实的百分比数字，例如 156', 12],
  ['caseMetric', '增长指标', 'text', '例如销量、流量或销售额，请填写实际指标', 80],
  ['casePeriod', '统计周期', 'text', '说明日期范围及对比基准', 120],
  ['caseCategory', '产品品类', 'text', '填写案例实际产品品类', 120]
]
export function SitePanel({ request }) {
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [baseline, setBaseline] = useState('')
  const dirty = settings !== null && JSON.stringify(settings) !== baseline
  useUnsavedChanges(dirty || uploading)
  const load = useCallback(async () => {
    setError('')
    setBusy(true)
    try {
      const next = await request('/api/admin/site')
      setSettings(next)
      setBaseline(JSON.stringify(next))
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [request])
  useEffect(() => {
    load()
  }, [load])
  const save = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setBusy(true)
    try {
      const next = await request('/api/admin/site', { method: 'PATCH', body: settings })
      setSettings(next)
      setBaseline(JSON.stringify(next))
      try {
        localStorage.setItem('yingyao-catalog-updated', String(Date.now()))
      } catch {}
      setNotice('首页设置已保存。重新打开首页或切回首页即可更新。')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const uploadQr = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError('')
    setNotice('')
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 512 * 1024) {
      setError('请上传 PNG、JPG 或 WebP 图片，大小不超过 512 KB。')
      return
    }
    setUploading(true)
    try {
      const image = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'))
        reader.onload = () => {
          const preview = new Image()
          preview.onload = () => resolve(reader.result)
          preview.onerror = () => reject(new Error('图片无法打开，请选择有效的二维码图片。'))
          preview.src = reader.result
        }
        reader.readAsDataURL(file)
      })
      setSettings((current) => ({ ...current, wechatQr: image }))
    } catch (error) {
      setError(error.message)
    } finally {
      setUploading(false)
    }
  }
  const renderFields = (fields) =>
    fields.map(([key, label, type, help, maxLength]) => (
      <div className="admin-field" key={key}>
        <label htmlFor={`site-${key}`}>{label}</label>
        <input
          id={`site-${key}`}
          type={type}
          maxLength={maxLength}
          value={settings[key]}
          onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))}
        />
        <small>{help}</small>
      </div>
    ))
  return (
    <>
      <section className="admin-site-panel">
        {error && (
          <p className="admin-notice error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="admin-notice success" role="status">
            {notice}
          </p>
        )}
        {!settings ? (
          <>
            <p>{busy ? '正在读取首页设置…' : '首页设置未能加载，请重新读取。'}</p>
            <button className="admin-button" disabled={busy} onClick={load}>
              重新读取
            </button>
          </>
        ) : (
          <form onSubmit={save}>
            <fieldset className="site-editor-fields" disabled={busy || uploading}>
              <fieldset className="site-settings-group">
                <legend>首页增长案例</legend>
                <p className="site-settings-help">补齐真实数据与说明后再发布。未发布的案例不会出现在首页。</p>
                <div className="editor-fields">
                  {renderFields(caseFields)}
                  <div className="admin-field wide">
                    <label htmlFor="site-caseSource">案例数据说明</label>
                    <textarea
                      id="site-caseSource"
                      rows="4"
                      maxLength="1000"
                      value={settings.caseSource}
                      onChange={(event) =>
                        setSettings((current) => ({ ...current, caseSource: event.target.value }))
                      }
                    />
                    <small>说明增长口径、对比方法、数据来源与必要条件，发布前核实。</small>
                  </div>
                </div>
                <label className="site-publish">
                  <input
                    type="checkbox"
                    checked={settings.casePublished}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, casePublished: event.target.checked }))
                    }
                  />
                  在首页展示增长案例（须补齐指标、周期、品类与说明）
                </label>
              </fieldset>
              <fieldset className="site-settings-group">
                <legend>微信合作咨询</legend>
                <p className="site-settings-help">
                  二维码与微信号展示在首页“如何合作”区域。邮箱仅保留在设置中，定制需求表单继续暂停。
                </p>
                <div className="editor-fields">
                  {renderFields(contactFields)}
                  <div className="admin-field wide">
                    <label htmlFor="site-wechatQr">微信二维码图片</label>
                    <input
                      id="site-wechatQr"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={busy || uploading}
                      onChange={uploadQr}
                    />
                    <small>
                      {uploading
                        ? '正在读取图片…'
                        : 'PNG、JPG 或 WebP，不超过 512 KB。保留完整二维码及四周白边；上传或移除后，点击“保存首页设置”生效。'}
                    </small>
                    {settings.wechatQr && (
                      <div className="site-qr-preview">
                        <img src={settings.wechatQr} alt="微信二维码预览" width="160" height="160" />
                        <button
                          type="button"
                          className="admin-button"
                          disabled={busy || uploading}
                          onClick={() => {
                            setSettings((current) => ({ ...current, wechatQr: '' }))
                            setNotice('二维码已从待保存设置中移除，保存后首页生效。')
                          }}
                        >
                          移除二维码
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </fieldset>
            </fieldset>
            <div className="site-actions">
              <button className="admin-button primary" disabled={busy || uploading}>
                <Save size={16} />
                {busy ? '保存中…' : '保存首页设置'}
              </button>
              <button
                type="button"
                className="admin-button"
                onClick={() => {
                  if (confirmNavigation()) load()
                }}
                disabled={busy || uploading}
              >
                重新读取
              </button>
              {dirty && (
                <span className="admin-dirty" role="status">
                  有未保存的首页修改
                </span>
              )}
            </div>
          </form>
        )}
      </section>
      <CaseImagesPanel request={request} />
    </>
  )
}
