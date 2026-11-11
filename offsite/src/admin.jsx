import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { mountApp } from './mount-app.jsx'
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Folder,
  Layers,
  LockKeyhole,
  LogOut,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  X,
  Inbox,
  House
} from 'lucide-react'
import { InquiriesPanel, SitePanel } from './admin-home.jsx'
import SiteBrand from './site-brand.jsx'
import useUnsavedChanges, { confirmNavigation } from './use-unsaved-changes.js'
import './admin.css'

const statuses = { published: '已上架', draft: '草稿', archived: '已下架', deleted: '回收站' }
const recordActions = {
  published: { label: '上架', description: '上架后，所属分类公开时会显示在价格表中。' },
  archived: { label: '下架', description: '下架后将不再显示在前台，后台仍可编辑或重新上架。' },
  deleted: { label: '删除', description: '报价将移入回收站，前台不再显示。资料保留，可在回收站恢复。' },
  draft: { label: '恢复', description: '恢复后先保存为草稿，确认内容后可手动上架。' }
}
const recordFields = [
  'name',
  'category',
  'price',
  'currency',
  'form',
  'platform',
  'time',
  'traffic',
  'url',
  'sample_url',
  'desc'
]
const announceUpdate = () => {
  try {
    localStorage.setItem('yingyao-catalog-updated', String(Date.now()))
  } catch {
    /* Other tabs also refresh on focus. */
  }
}
const prettyDate = (value) =>
  new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
const emptyCatalog = { records: [], groups: [], categoryMeta: [] }
const missingField = (value) => !String(value ?? '').trim() || value === '—'
const orderCatalog = (data) => {
  const groups = [...data.groups].sort((a, b) => a.sort_order - b.sort_order)
  const groupRanks = new Map(groups.map((group, index) => [group.id, index]))
  const categoryMeta = [...data.categoryMeta].sort(
    (a, b) => groupRanks.get(a.group_id) - groupRanks.get(b.group_id) || a.sort_order - b.sort_order
  )
  const categoryRanks = new Map(categoryMeta.map((category, index) => [category.id, index]))
  const records = [...data.records].sort(
    (a, b) =>
      categoryRanks.get(a.category_id) - categoryRanks.get(b.category_id) || a.sort_order - b.sort_order
  )
  return { ...data, groups, categoryMeta, records }
}
function Brand() {
  return <SiteBrand className="admin-brand" subtitle="报价管理后台" />
}
function Notice({ children, error = false }) {
  return children ? (
    <p className={`admin-notice ${error ? 'error' : 'success'}`} role={error ? 'alert' : 'status'}>
      {!error && <Check size={16} />}
      <span>{children}</span>
    </p>
  ) : null
}
function Field({ label, wide, help, children }) {
  const id = useId()
  return (
    <div className={`admin-field ${wide ? 'wide' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) && ['input', 'select', 'textarea'].includes(child.type)
          ? React.cloneElement(child, { id, 'aria-describedby': help ? `${id}-help` : undefined })
          : child
      )}
      {help && <small id={`${id}-help`}>{help}</small>}
    </div>
  )
}

function EditorDialog({ title, subtitle, onClose, children }) {
  const ref = useRef(null),
    closeRef = useRef(onClose)
  closeRef.current = onClose
  useLayoutEffect(() => {
    const dialog = ref.current,
      opener = document.activeElement,
      overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    dialog.querySelector('[data-initial-focus], input, select, textarea')?.focus({ preventScroll: true })
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
      else document.querySelector('[aria-label="搜索报价信息"]')?.focus({ preventScroll: true })
    }
  }, [])
  const trap = (event) => {
    if (event.key !== 'Tab') return
    const elements = [
      ...ref.current.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
      )
    ].filter((el) => el.getClientRects().length)
    const first = elements[0],
      last = elements.at(-1)
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  return (
    <dialog
      className="admin-dialog"
      ref={ref}
      aria-labelledby="editor-title"
      onKeyDown={trap}
      onCancel={(event) => {
        event.preventDefault()
        closeRef.current()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current()
      }}
    >
      <div className="admin-editor">
        <header>
          <div>
            <span className="admin-eyebrow">{subtitle}</span>
            <h2 id="editor-title">{title}</h2>
          </div>
          <button className="admin-icon" onClick={onClose} aria-label="关闭编辑">
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  )
}

function RecordEditor({ item, data, onSave, onClose }) {
  const initial = useMemo(
    () => ({ ...Object.fromEntries(recordFields.map((key) => [key, item[key] ?? ''])), ...item }),
    [item]
  )
  const [form, setForm] = useState(initial),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(initial))
  const field = (key) => ({
    value: form[key],
    onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  })
  const close = () => {
    if (
      !saving &&
      (JSON.stringify(form) === JSON.stringify(initial) ||
        window.confirm('有尚未保存的修改，确定离开编辑吗？'))
    )
      onClose()
  }
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }
  return (
    <EditorDialog title={item.entryId ? '编辑报价' : '新增报价'} subtitle="渠道与服务信息" onClose={close}>
      <form onSubmit={submit}>
        <div className="editor-fields">
          <Field label="渠道 / 服务名称 *" wide>
            <input
              {...field('name')}
              required
              maxLength={200}
              placeholder="例如：Slickdeals 红人帖"
              autoComplete="off"
            />
          </Field>
          <Field label="所属分类 *">
            <select {...field('category_id')} required>
              {data.categoryMeta.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                  {!category.is_visible ? '（分类已隐藏）' : ''}
                </option>
              ))}
            </select>
          </Field>
          <Field label="渠道类型">
            <input {...field('category')} maxLength={200} placeholder="例如：Deal 站 / FB 群组" />
          </Field>
          <Field label="参考报价" help="支持数字、区间和套餐说明；0 表示免费，留空表示待确认。">
            <input {...field('price')} maxLength={500} placeholder="例如：598 / 500–800 / 按套餐报价" />
          </Field>
          <Field label="报价币种 *">
            <input
              {...field('currency')}
              required
              minLength={3}
              maxLength={3}
              list="currency-codes"
              placeholder="CNY"
            />
            <datalist id="currency-codes">
              {['CNY', 'USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
          </Field>
          <Field label="市场 / 平台">
            <input {...field('platform')} maxLength={300} placeholder="例如：美国 / AMZ" />
          </Field>
          <Field label="发布形式">
            <input {...field('form')} maxLength={300} placeholder="例如：红人帖 / 新闻稿" />
          </Field>
          <Field label="交付时效">
            <input {...field('time')} maxLength={300} placeholder="例如：1–3 天 / 排期确认" />
          </Field>
          <Field label="月流量">
            <input {...field('traffic')} maxLength={300} placeholder="例如：100 万" />
          </Field>
          <Field label="渠道链接" wide>
            <input {...field('url')} maxLength={3000} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="案例链接" wide>
            <input {...field('sample_url')} maxLength={3000} placeholder="https://…" inputMode="url" />
          </Field>
          <Field label="合作要求与服务说明" wide>
            <textarea
              {...field('desc')}
              rows={5}
              maxLength={20000}
              placeholder="适用产品、发布要求、折扣门槛、交付内容等"
            />
          </Field>
          <Field label="展示状态">
            <select {...field('status')}>
              {Object.entries(statuses).filter(([value]) => value !== 'deleted').map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="分类内排序" help="数字越小越靠前。">
            <input
              type="number"
              min={0}
              max={100000}
              step={1}
              required
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))
              }
            />
          </Field>
        </div>
        <div className="editor-error">
          <Notice error>{error}</Notice>
        </div>
        <footer className="editor-footer">
          <span>上架后将在前台展示；草稿和下架可保留信息。</span>
          <div>
            <button type="button" className="admin-button" disabled={saving} onClick={close}>
              取消
            </button>
            <button className="admin-button primary" disabled={saving}>
              {saving ? '正在保存…' : '保存报价'}
            </button>
          </div>
        </footer>
      </form>
    </EditorDialog>
  )
}

function TaxonomyEditor({ item, kind, data, onSave, onClose }) {
  const isCategory = kind === 'categories',
    noun = isCategory ? '分类' : '业务分组'
  const [form, setForm] = useState(item),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('')
  useUnsavedChanges(JSON.stringify(form) !== JSON.stringify(item))
  const field = (key) => ({
    value: form[key],
    onChange: (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  })
  const close = () => {
    if (
      !saving &&
      (JSON.stringify(form) === JSON.stringify(item) || window.confirm('有尚未保存的修改，确定离开编辑吗？'))
    )
      onClose()
  }
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }
  return (
    <EditorDialog title={`${item.id ? '编辑' : '新增'}${noun}`} subtitle="目录设置" onClose={close}>
      <form onSubmit={submit}>
        <div className="editor-fields">
          <Field label={`${noun}名称 *`} wide>
            <input {...field(isCategory ? 'label' : 'title')} required maxLength={80} />
          </Field>
          {isCategory && (
            <>
              <Field label="所属业务分组 *">
                <select {...field('group_id')}>
                  {data.groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.title}
                      {group.is_deleted ? '（已隐藏）' : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="分类图标" help="可留空或填写一个表情符号。">
                <input {...field('icon')} maxLength={20} />
              </Field>
            </>
          )}
          <Field label="展示顺序" help="同一分组中，数字越小越靠前。">
            <input
              type="number"
              min={0}
              max={100000}
              required
              value={form.sort_order}
              onChange={(event) =>
                setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))
              }
            />
          </Field>
          <label className="admin-checkbox wide">
            <input
              type="checkbox"
              checked={isCategory ? form.is_visible : !form.is_deleted}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  ...(isCategory
                    ? { is_visible: event.target.checked }
                    : { is_deleted: !event.target.checked })
                }))
              }
            />
            <span>
              在前台显示<small>隐藏{noun}时，所属报价也会一起隐藏；已保存的信息仍然保留。</small>
            </span>
          </label>
        </div>
        <div className="editor-error">
          <Notice error>{error}</Notice>
        </div>
        <footer className="editor-footer">
          <span>保存后同步更新前台目录。</span>
          <div>
            <button type="button" className="admin-button" disabled={saving} onClick={close}>
              取消
            </button>
            <button className="admin-button primary" disabled={saving}>
              {saving ? '正在保存…' : `保存${noun}`}
            </button>
          </div>
        </footer>
      </form>
    </EditorDialog>
  )
}

function AuthPage({ setup, request, onUser, initialError }) {
  const [username, setUsername] = useState('admin'),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [bootstrapToken, setBootstrapToken] = useState(''),
    [error, setError] = useState(initialError || ''),
    [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (setup && password !== confirmation) {
      setError('两次输入的密码不一致')
      return
    }
    setBusy(true)
    try {
      const result = await request(`/api/auth/${setup ? 'setup' : 'login'}`, {
        method: 'POST',
        body: { username, password, bootstrapToken }
      })
      onUser(result.user)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }
  return (
    <main className="auth-page">
      <Brand />
      <section className="auth-card">
        <span className="auth-mark">
          <LockKeyhole size={25} />
        </span>
        <span className="admin-eyebrow">荧耀站外 / 管理员入口</span>
        <h1>{setup ? '设置你的管理账号' : '登录报价管理后台'}</h1>
        <p>{setup ? '首次使用，设置账号和密码后即可管理全部报价。' : '管理渠道、服务报价与前台展示内容。'}</p>
        <form onSubmit={submit}>
          <Field label="管理员账号">
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              pattern="[a-zA-Z0-9_.\-]{3,40}"
              maxLength={40}
            />
          </Field>
          <Field
            label={setup ? '设置密码' : '密码'}
            help={setup ? '至少 10 位，建议组合使用字母、数字和符号。' : ''}
          >
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={setup ? 'new-password' : 'current-password'}
              required
              minLength={setup ? 10 : undefined}
              maxLength={128}
            />
          </Field>
          {setup && (
            <>
              <Field label="确认密码">
                <input
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={10}
                  maxLength={128}
                />
              </Field>
              <details className="bootstrap-option">
                <summary>远程部署的初始化密钥</summary>
                <Field label="初始化密钥" help="本机访问无需填写。远程部署时使用服务器配置的密钥。">
                  <input
                    type="password"
                    value={bootstrapToken}
                    onChange={(event) => setBootstrapToken(event.target.value)}
                    autoComplete="off"
                  />
                </Field>
              </details>
            </>
          )}
          <Notice error>{error}</Notice>
          <button className="admin-button primary" disabled={busy}>
            {busy ? '请稍候…' : setup ? '创建账号并进入后台' : '登录后台'}
          </button>
        </form>
        <a className="auth-return" href="/">
          返回品牌首页 <ArrowUpRight size={14} />
        </a>
      </section>
      <p className="auth-caption">仅供荧耀站外授权管理员使用</p>
    </main>
  )
}

function AccountPanel({ user, request, onUser }) {
  const [currentPassword, setCurrentPassword] = useState(''),
    [password, setPassword] = useState(''),
    [confirmation, setConfirmation] = useState(''),
    [error, setError] = useState(''),
    [success, setSuccess] = useState(''),
    [busy, setBusy] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    if (password !== confirmation) {
      setError('两次输入的新密码不一致')
      return
    }
    setBusy(true)
    try {
      const result = await request('/api/auth/password', {
        method: 'POST',
        body: { currentPassword, password }
      })
      onUser(result.user)
      setCurrentPassword('')
      setPassword('')
      setConfirmation('')
      setSuccess('密码已更新，其他登录会话已失效。')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="account-panel">
      <h2>修改登录密码</h2>
      <p>当前管理员：{user.username}</p>
      <form onSubmit={submit}>
        <Field label="当前密码">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </Field>
        <Field label="新密码" help="10–128 个字符。">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        </Field>
        <Field label="确认新密码">
          <input
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
            required
            minLength={10}
            maxLength={128}
          />
        </Field>
        <Notice error>{error}</Notice>
        <Notice>{success}</Notice>
        <button className="admin-button primary" disabled={busy}>
          {busy ? '正在更新…' : '更新密码'}
        </button>
      </form>
    </section>
  )
}

function AdminApp() {
  const [auth, setAuth] = useState(null),
    [authError, setAuthError] = useState(''),
    [loadingAuth, setLoadingAuth] = useState(true)
  const [data, setData] = useState(emptyCatalog),
    [loaded, setLoaded] = useState(false),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const [view, setView] = useState('records'),
    [query, setQuery] = useState(''),
    [category, setCategory] = useState('all'),
    [status, setStatus] = useState('all'),
    [completeness, setCompleteness] = useState('all'),
    [page, setPage] = useState(1),
    [editor, setEditor] = useState(null),
    [recordAction, setRecordAction] = useState(null),
    [actionSaving, setActionSaving] = useState(false),
    [actionError, setActionError] = useState('')
  const actionPending = useRef(false)
  const user = auth?.user
  const request = useCallback(
    async (path, options = {}) => {
      const response = await fetch(path, {
        method: options.method || 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(user ? { 'X-CSRF-Token': user.csrfToken } : {})
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
      })
      let result
      try {
        result = await response.json()
      } catch {
        throw new Error('服务暂时无法连接，请稍后重试')
      }
      if (!response.ok) {
        if (response.status === 401 && user) {
          setAuth({ setupRequired: false, user: null })
          setAuthError('登录已过期，请重新登录。')
        }
        throw new Error(result.error || '操作失败，请重试')
      }
      return result
    },
    [user]
  )
  useEffect(() => {
    document.title = '荧耀站外 · 报价管理后台'
    let live = true
    request('/api/auth/session')
      .then((result) => {
        if (live) setAuth(result)
      })
      .catch((e) => {
        if (live) setAuthError(e.message)
      })
      .finally(() => {
        if (live) setLoadingAuth(false)
      })
    return () => {
      live = false
    }
  }, [])
  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError('')
    try {
      setData(orderCatalog(await request('/api/admin/catalog')))
      setLoaded(true)
    } catch (e) {
      setError(e.message)
    } finally {
      setRefreshing(false)
    }
  }, [request])
  useEffect(() => {
    if (user) refresh()
    else {
      setData(emptyCatalog)
      setLoaded(false)
      setEditor(null)
      setRecordAction(null)
    }
  }, [user, refresh])
  useEffect(() => {
    setPage(1)
  }, [query, category, status, completeness])
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(''), 5000)
    return () => clearTimeout(timer)
  }, [notice])
  const filtered = useMemo(
    () =>
      data.records.filter(
        (record) =>
          (category === 'all' || record.category_id === category) &&
          (status === 'all' ? record.status !== 'deleted' : record.status === status) &&
          (completeness === 'all' || missingField(record[completeness])) &&
          `${record.name} ${record.category} ${record.platform} ${record.price} ${record.desc}`
            .toLowerCase()
            .includes(query.trim().toLowerCase())
      ),
    [data.records, category, status, query, completeness]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / 25))
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])
  const visible = filtered.slice((page - 1) * 25, page * 25)
  const categoryById = Object.fromEntries(data.categoryMeta.map((item) => [item.id, item]))
  const groupById = Object.fromEntries(data.groups.map((item) => [item.id, item]))
  const isPublicCategory = (category) =>
    category.is_visible && !category.is_deleted && !groupById[category.group_id]?.is_deleted
  const isPublic = (record) =>
    record.status === 'published' &&
    categoryById[record.category_id] &&
    isPublicCategory(categoryById[record.category_id])
  const publishedCount = data.records.filter(isPublic).length
  const activeRecords = data.records.filter((record) => record.status !== 'deleted')
  const deletedCount = data.records.length - activeRecords.length
  const openRecordAction = (record, nextStatus) => {
    setActionError('')
    setRecordAction({ record, nextStatus })
  }
  const applyRecordAction = async () => {
    if (!recordAction || actionPending.current) return
    actionPending.current = true
    setActionSaving(true)
    setActionError('')
    const { record, nextStatus } = recordAction
    try {
      const result = await request(`/api/admin/records/${encodeURIComponent(record.entryId)}/status`, {
        method: 'PATCH', body: { status: nextStatus, version: record.version }
      })
      setData((current) => orderCatalog({
        ...current, updatedAt: result.item.updatedAt,
        records: current.records.map((item) => item.entryId === record.entryId ? result.item : item)
      }))
      announceUpdate()
      setRecordAction(null)
      setNotice(nextStatus === 'deleted' ? '已移入回收站，可在回收站恢复。' : nextStatus === 'draft' ? '已恢复为草稿，确认内容后可上架。' : `已${recordActions[nextStatus].label}，前台报价同步更新。`)
    } catch (e) {
      setActionError(e.message)
    } finally {
      actionPending.current = false
      setActionSaving(false)
    }
  }
  const onUser = (next) => {
    if (!user) {
      setView('records')
      setQuery('')
      setCategory('all')
      setStatus('all')
      setPage(1)
      setNotice('')
      setError('')
    }
    setAuth({ setupRequired: false, user: next })
    setAuthError('')
  }
  const save = async (form) => {
    const id = editor.kind === 'records' ? form.entryId : form.id
    const result = await request(`/api/admin/${editor.kind}${id ? `/${encodeURIComponent(id)}` : ''}`, {
      method: id ? 'PATCH' : 'POST',
      body: form
    })
    const key = { records: 'records', categories: 'categoryMeta', groups: 'groups' }[editor.kind]
    const identity = editor.kind === 'records' ? 'entryId' : 'id'
    setData((current) =>
      orderCatalog({
        ...current,
        updatedAt: new Date().toISOString(),
        [key]: id
          ? current[key].map((item) => (item[identity] === id ? result.item : item))
          : [...current[key], result.item]
      })
    )
    announceUpdate()
    setEditor(null)
    setNotice('已保存，前台报价同步更新。')
  }
  const add = () => {
    if (view === 'records') {
      const categoryId =
        category !== 'all'
          ? category
          : data.categoryMeta.find((item) => item.is_visible)?.id || data.categoryMeta[0]?.id
      if (!categoryId) {
        setError('请先创建一个服务分类')
        return
      }
      setEditor({
        kind: view,
        item: {
          ...Object.fromEntries(recordFields.map((key) => [key, ''])),
          category_id: categoryId,
          currency: 'CNY',
          status: 'published',
          sort_order:
            Math.max(
              0,
              ...data.records.filter((item) => item.category_id === categoryId).map((item) => item.sort_order)
            ) + 1
        }
      })
    } else if (view === 'categories') {
      if (!data.groups.length) {
        setError('请先创建一个业务分组')
        return
      }
      setEditor({
        kind: view,
        item: {
          label: '',
          icon: '',
          group_id: data.groups.find((item) => !item.is_deleted)?.id || data.groups[0].id,
          is_visible: true,
          sort_order: 1
        }
      })
    } else
      setEditor({
        kind: 'groups',
        item: { title: '', is_deleted: false, sort_order: data.groups.length + 1 }
      })
  }
  const exportData = async () => {
    setError('')
    try {
      const result = await request('/api/admin/export'),
        url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `荧耀站外-报价备份-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('完整报价数据已导出，包含草稿、下架及回收站内容。')
    } catch (e) {
      setError(e.message)
    }
  }
  const logout = async () => {
    if (!confirmNavigation()) return
    try {
      await request('/api/auth/logout', { method: 'POST', body: {} })
      setAuth({ setupRequired: false, user: null })
      setAuthError('')
    } catch (e) {
      setError(e.message)
    }
  }
  if (loadingAuth)
    return (
      <main className="auth-page">
        <Brand />
        <p className="admin-loading">正在连接管理后台…</p>
      </main>
    )
  if (!auth)
    return (
      <main className="auth-page">
        <Brand />
        <Notice error>{authError}</Notice>
        <button className="admin-button" onClick={() => location.reload()}>
          重新连接
        </button>
      </main>
    )
  if (!user)
    return (
      <AuthPage
        key={String(auth.setupRequired)}
        setup={auth.setupRequired}
        request={request}
        onUser={onUser}
        initialError={authError}
      />
    )
  const headings = {
    records: ['报价管理', '维护每一项渠道、价格和合作要求。'],
    categories: ['分类管理', '调整前台服务目录、分组和显示顺序。'],
    groups: ['业务分组', '管理站外推广、红人视频等业务方向。'],
    inquiries: ['客户需求', '查看已接收的产品需求与意向渠道，跟进合作沟通。'],
    site: ['首页设置', '管理首页案例、微信号与合作咨询二维码。'],
    account: ['账户设置', '管理你的后台登录密码。']
  }
  const menus = [
    ['records', Layers, '报价管理'],
    ['categories', Folder, '分类管理'],
    ['groups', Settings2, '业务分组'],
    ['site', House, '首页设置'],
    ['inquiries', Inbox, '客户需求'],
    ['account', LockKeyhole, '账户设置']
  ]
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <Brand />
        <div>
          <a className="admin-site-link" href="/quote" target="_blank" rel="noreferrer">
            <Eye size={15} />
            查看前台
            <ArrowUpRight size={13} />
          </a>
          <span className="admin-user">{user.username}</span>
          <button className="admin-icon" onClick={logout} aria-label="退出登录" title="退出登录">
            <LogOut size={17} />
          </button>
        </div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <span className="admin-eyebrow">工作空间</span>
          <nav aria-label="后台管理导航">
            {menus.map(([id, Icon, label]) => (
              <button
                key={id}
                className={view === id ? 'active' : ''}
                aria-current={view === id ? 'page' : undefined}
                onClick={() => {
                  if (view === id || !confirmNavigation()) return
                  setView(id)
                  setError('')
                }}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </nav>
          <p>
            内容保存到数据库
            <br />
            <span>草稿与下架内容可继续编辑</span>
          </p>
        </aside>
        <main className="admin-main">
          <div className="admin-heading">
            <div>
              <span className="admin-eyebrow">荧耀站外 / 内容管理</span>
              <h1>{headings[view][0]}</h1>
              <p>{headings[view][1]}</p>
            </div>
            {['records', 'categories', 'groups'].includes(view) && (
              <button className="admin-button primary" disabled={!loaded} onClick={add}>
                <Plus size={17} />
                {view === 'records' ? '新增报价' : view === 'categories' ? '新增分类' : '新增分组'}
              </button>
            )}
          </div>
          <Notice error>{error}</Notice>
          <Notice>{notice}</Notice>
          {view === 'inquiries' ? (
            <InquiriesPanel request={request} />
          ) : view === 'site' ? (
            <SitePanel request={request} />
          ) : view === 'account' ? (
            <AccountPanel user={user} request={request} onUser={onUser} />
          ) : (
            <>
              <div className="admin-stats">
                <div>
                  <span>全部报价</span>
                  <strong>
                    {activeRecords.length}
                    <small>项</small>
                  </strong>
                </div>
                <div>
                  <span>前台展示</span>
                  <strong>
                    {publishedCount}
                    <small>项</small>
                  </strong>
                </div>
                <div>
                  <span>服务分类</span>
                  <strong>
                    {data.categoryMeta.filter(isPublicCategory).length}
                    <small>个显示中</small>
                  </strong>
                </div>
                <div className="admin-stats-date">
                  <span>最近更新</span>
                  <p>{data.updatedAt ? prettyDate(data.updatedAt) : '—'}</p>
                </div>
              </div>
              <div className={`admin-tools ${view === 'records' ? 'admin-record-tools' : ''}`}>
                {view === 'records' ? (
                  <>
                    <label className="admin-search">
                      <Search size={17} />
                      <input
                        aria-label="搜索报价信息"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="搜索渠道、价格或服务说明…"
                      />
                      {query && (
                        <button className="admin-icon" aria-label="清除搜索" onClick={() => setQuery('')}>
                          <X size={15} />
                        </button>
                      )}
                    </label>
                    <select
                      aria-label="筛选所属分类"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="all">全部分类</option>
                      {data.categoryMeta.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label="筛选待完善信息"
                      value={completeness}
                      onChange={(event) => setCompleteness(event.target.value)}
                    >
                      <option value="all">信息完整度不限</option>
                      <option value="price">
                        价格待确认（{activeRecords.filter((item) => missingField(item.price)).length}）
                      </option>
                      <option value="desc">
                        合作说明待完善（{activeRecords.filter((item) => missingField(item.desc)).length}）
                      </option>
                      <option value="time">
                        排期待确认（{activeRecords.filter((item) => missingField(item.time)).length}）
                      </option>
                    </select>
                    <select
                      aria-label="筛选展示状态"
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      <option value="all">全部状态</option>
                      {Object.entries(statuses).map(([id, title]) => (
                        <option key={id} value={id}>
                          {title}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <p>隐藏目录后，其报价会同时从前台隐藏。</p>
                )}
                <div className="admin-tool-actions">
                  {view === 'records' && <button
                    className={`admin-button ${status === 'deleted' ? 'primary' : ''}`}
                    aria-pressed={status === 'deleted'}
                    onClick={() => { setStatus(status === 'deleted' ? 'all' : 'deleted'); setCategory('all'); setQuery(''); setCompleteness('all') }}
                  >{status === 'deleted' ? '返回报价' : `回收站（${deletedCount}）`}</button>}
                  <button className="admin-button" onClick={refresh} disabled={refreshing}>
                    <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
                    <span>{refreshing ? '加载中' : '刷新'}</span>
                  </button>
                  <button className="admin-button" onClick={exportData} disabled={!loaded}>
                    <Download size={14} />
                    <span>备份</span>
                  </button>
                </div>
              </div>
              {!loaded ? (
                <p className="admin-loading">
                  {refreshing ? '正在读取报价数据…' : '数据尚未加载，请点击刷新重试。'}
                </p>
              ) : view === 'records' ? (
                <>
                  <section className="admin-record-list" aria-label="报价列表">
                    <div className="admin-record-head" aria-hidden="true">
                      <span>渠道 / 服务</span>
                      <span>市场 / 平台</span>
                      <span>参考报价</span>
                      <span>状态</span>
                      <span>操作</span>
                    </div>
                    {visible.map((record) => (
                      <article className="admin-record" key={record.entryId}>
                        <div className="admin-record-name">
                          <button disabled={record.status === 'deleted'} onClick={() => setEditor({ kind: 'records', item: record })}>
                            {record.name}
                          </button>
                          <p>
                            {categoryById[record.category_id]?.label}{' '}
                            <span>· {record.category || '未设置类型'}</span>
                          </p>
                        </div>
                        <span className="admin-record-market">{record.platform || '待确认'}</span>
                        <div className="admin-record-price">
                          <strong>{record.price || '价格待确认'}</strong>
                          <small>{record.currency}</small>
                        </div>
                        <div className="admin-record-status">
                          <span className={`status-pill ${record.status}`}>{statuses[record.status]}</span>
                          {record.status === 'published' && !isPublic(record) && <small>所属目录隐藏</small>}
                        </div>
                        <div className="admin-record-actions" role="group" aria-label={`${record.name}的操作`}>
                        {record.status === 'deleted' ? <button
                          className="admin-edit-link"
                          aria-label={`恢复 ${record.name}`}
                          onClick={() => openRecordAction(record, 'draft')}
                        >恢复</button> : <>
                        <button
                          className="admin-edit-link"
                          aria-label={`编辑 ${record.name}`}
                          onClick={() => setEditor({ kind: 'records', item: record })}
                        >
                          编辑
                        </button>
                        <button className="admin-edit-link" aria-label={`${record.status === 'published' ? '下架' : '上架'} ${record.name}`}
                          onClick={() => openRecordAction(record, record.status === 'published' ? 'archived' : 'published')}>
                          {record.status === 'published' ? '下架' : '上架'}
                        </button>
                        <button className="admin-edit-link admin-delete-link" aria-label={`删除 ${record.name}`}
                          onClick={() => openRecordAction(record, 'deleted')}>删除</button>
                        </>}
                        </div>
                      </article>
                    ))}
                    {!visible.length && (
                      <div className="admin-empty">
                        <Search size={25} />
                        <h2>{status === 'deleted' ? '回收站暂无匹配报价' : '暂无匹配报价'}</h2>
                        <p>{status === 'deleted' ? '删除的报价会保留在这里，可随时恢复为草稿。' : '调整筛选条件，或新增一条报价。'}</p>
                      </div>
                    )}
                  </section>
                  <div className="admin-pagination">
                    <span>
                      共 {filtered.length} 项 · 第 {page} / {pageCount} 页
                    </span>
                    <div>
                      <button
                        className="admin-icon"
                        aria-label="上一页"
                        disabled={page === 1}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        className="admin-icon"
                        aria-label="下一页"
                        disabled={page === pageCount}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <section
                  className="taxonomy-list"
                  aria-label={view === 'categories' ? '分类列表' : '分组列表'}
                >
                  {(view === 'categories' ? data.categoryMeta : data.groups).map((item) => {
                    const hidden = view === 'categories' ? !isPublicCategory(item) : item.is_deleted
                    const count =
                      view === 'categories'
                        ? activeRecords.filter((record) => record.category_id === item.id).length
                        : data.categoryMeta.filter((category) => category.group_id === item.id).length
                    return (
                      <article className="taxonomy-row" key={item.id}>
                        <span className="taxonomy-icon">
                          {view === 'categories' ? <Folder size={20} /> : <Layers size={20} />}
                        </span>
                        <div>
                          <h2>{item.label || item.title}</h2>
                          <p>
                            {view === 'categories' ? groupById[item.group_id]?.title : '业务分组'} · {count}{' '}
                            {view === 'categories' ? '项报价' : '个分类'} · 排序 {item.sort_order}
                          </p>
                        </div>
                        <span className={`status-pill ${hidden ? 'archived' : 'published'}`}>
                          {hidden ? '已隐藏' : '显示中'}
                        </span>
                        <button
                          className="admin-edit-link"
                          aria-label={`编辑 ${item.label || item.title}`}
                          onClick={() => setEditor({ kind: view, item })}
                        >
                          编辑
                        </button>
                      </article>
                    )
                  })}
                </section>
              )}
              <p className="admin-footnote">更改保存后即生效。删除的报价保留在回收站；前台在切回页面或最多 30 秒后读取最新数据。</p>
            </>
          )}
        </main>
      </div>
      {recordAction && <EditorDialog
        title={`${recordActions[recordAction.nextStatus].label}报价？`}
        subtitle="报价管理"
        onClose={() => { if (!actionPending.current) setRecordAction(null) }}
      >
        <div className="admin-action-confirm">
          <strong>{recordAction.record.name}</strong>
          <p>{recordActions[recordAction.nextStatus].description}</p>
          <Notice error>{actionError}</Notice>
          <div className="admin-confirm-actions">
            <button className="admin-button" data-initial-focus disabled={actionSaving} onClick={() => setRecordAction(null)}>取消</button>
            <button className="admin-button primary" disabled={actionSaving} onClick={applyRecordAction}>
              {actionSaving ? '正在处理…' : `确认${recordActions[recordAction.nextStatus].label}`}
            </button>
          </div>
        </div>
      </EditorDialog>}
      {editor &&
        (editor.kind === 'records' ? (
          <RecordEditor item={editor.item} data={data} onSave={save} onClose={() => setEditor(null)} />
        ) : (
          <TaxonomyEditor
            item={editor.item}
            kind={editor.kind}
            data={data}
            onSave={save}
            onClose={() => setEditor(null)}
          />
        ))}
    </div>
  )
}
mountApp(<AdminApp />)
