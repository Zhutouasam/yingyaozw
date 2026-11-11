import React, { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Images, Save } from 'lucide-react'
import readImage from './read-image.js'
import useUnsavedChanges, { confirmNavigation } from './use-unsaved-changes.js'

export default function CaseImagesPanel({ request }) {
  const [items, setItems] = useState(null),
    [saved, setSaved] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const dirty = items !== null && JSON.stringify(items) !== JSON.stringify(saved)
  useUnsavedChanges(dirty || busy)
  const load = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const result = (await request('/api/admin/cases')).items
      setItems(result)
      setSaved(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }, [request])
  useEffect(() => {
    load()
  }, [load])
  const update = (id, fields) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...fields } : item)))
  const upload = async (event) => {
    const files = [...event.target.files]
    event.target.value = ''
    if (!files.length || !confirmNavigation()) return
    if (files.length > 10) {
      setError('每次最多上传 10 张图片。')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const images = await Promise.all(files.map((file) => readImage(file)))
      // Reload first so any discarded draft never leaks into the uploaded records.
      const current = (await request('/api/admin/cases')).items
      setItems(current)
      setSaved(current)
      let order = Math.max(0, ...current.map((item) => item.sort_order))
      for (const image of images) {
        const item = (
          await request('/api/admin/cases', {
            method: 'POST',
            body: {
              title: '客户沟通记录',
              category: '',
              desc: '',
              is_visible: false,
              sort_order: ++order,
              image
            }
          })
        ).item
        setItems((previous) => [...previous, item])
        setSaved((previous) => [...previous, item])
      }
      setNotice(`已上传 ${images.length} 张图片作为草稿，填写品类、合作内容并勾选展示后保存。`)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const replace = async (id, event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      update(id, { image: await readImage(file) })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  const move = (index, direction) =>
    setItems((current) => {
      const result = [...current],
        destination = index + direction
      ;[result[index], result[destination]] = [result[destination], result[index]]
      return result.map((item, position) => ({ ...item, sort_order: position + 1 }))
    })
  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      for (const item of items) {
        if (JSON.stringify(item) === JSON.stringify(saved.find((previous) => previous.id === item.id)))
          continue
        const { image, ...body } = item
        if (image.startsWith('data:')) body.image = image
        const result = (await request(`/api/admin/cases/${item.id}`, { method: 'PATCH', body })).item
        setItems((current) => current.map((row) => (row.id === item.id ? result : row)))
        setSaved((current) =>
          current
            .map((row) => (row.id === item.id ? result : row))
            .sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id))
        )
      }
      try {
        localStorage.setItem('yingyao-catalog-updated', String(Date.now()))
      } catch {}
      setNotice('案例图片已保存，已勾选的图片会出现在首页循环相册中。')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-site-panel admin-case-panel" aria-labelledby="admin-cases-title">
      <h2 id="admin-cases-title">
        <Images size={18} aria-hidden="true" />
        首页案例图片
      </h2>
      <p className="site-settings-help">
        支持多张上传、上下排序、更换和隐藏。展示前填写产品品类与合作内容，并遮挡客户姓名、头像、微信号等私密信息。隐藏图片保留在后台。
      </p>
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
      <div className="admin-field">
        <label htmlFor="case-files">上传案例图片</label>
        <input
          id="case-files"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          disabled={busy}
          onChange={upload}
        />
        <small>每次最多 10 张，总计最多 60 张。较大的图片会自动压缩，上传后先保存为草稿。</small>
      </div>
      {items === null ? (
        <button type="button" className="admin-button" disabled={busy} onClick={load}>
          {busy ? '正在读取…' : '重新读取图片'}
        </button>
      ) : (
        <form onSubmit={save}>
          <fieldset className="case-editor-fields" disabled={busy}>
            {items.length === 0 && <p className="admin-empty">还没有案例图片，上传后即可管理。</p>}
            {items.map((item, index) => (
              <article className="admin-case-card" key={item.id}>
                <div className="admin-case-image">
                  <img src={item.image} alt={`${item.title}预览`} width="160" height="200" />
                  <label htmlFor={`case-replace-${item.id}`}>更换图片</label>
                  <input
                    id={`case-replace-${item.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => replace(item.id, event)}
                  />
                </div>
                <div className="admin-case-fields">
                  <div className="admin-field">
                    <label htmlFor={`case-title-${item.id}`}>案例标题</label>
                    <input
                      id={`case-title-${item.id}`}
                      maxLength="80"
                      required
                      value={item.title}
                      onChange={(event) => update(item.id, { title: event.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor={`case-category-${item.id}`}>产品品类</label>
                    <input
                      id={`case-category-${item.id}`}
                      maxLength="80"
                      required={item.is_visible}
                      value={item.category}
                      onChange={(event) => update(item.id, { category: event.target.value })}
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor={`case-desc-${item.id}`}>合作内容</label>
                    <textarea
                      id={`case-desc-${item.id}`}
                      rows="2"
                      maxLength="500"
                      required={item.is_visible}
                      value={item.desc}
                      onChange={(event) => update(item.id, { desc: event.target.value })}
                    />
                  </div>
                  <div className="admin-case-actions">
                    <label>
                      <input
                        type="checkbox"
                        checked={item.is_visible}
                        onChange={(event) => update(item.id, { is_visible: event.target.checked })}
                      />
                      在首页展示
                    </label>
                    <button
                      type="button"
                      className="admin-button"
                      aria-label={`上移案例 ${item.title}`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={14} />
                      上移
                    </button>
                    <button
                      type="button"
                      className="admin-button"
                      aria-label={`下移案例 ${item.title}`}
                      disabled={index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={14} />
                      下移
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </fieldset>
          <div className="site-actions">
            <button className="admin-button primary" disabled={busy || !dirty}>
              <Save size={16} />
              {busy ? '处理中…' : '保存案例图片'}
            </button>
            <button
              type="button"
              className="admin-button"
              disabled={busy}
              onClick={() => {
                if (confirmNavigation()) load()
              }}
            >
              重新读取
            </button>
            {dirty && (
              <span className="admin-dirty" role="status">
                有未保存的案例修改
              </span>
            )}
          </div>
        </form>
      )}
    </section>
  )
}
