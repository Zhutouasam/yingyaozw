import React, { useEffect, useRef, useState } from 'react'
import { Copy, Download, QrCode, X } from 'lucide-react'
import useHomeSummary from './use-home-summary.js'
import './wechat.css'

export function WechatActions({ contact }) {
  const [notice, setNotice] = useState(''),
    [busy, setBusy] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(contact.wechat)
      setNotice('微信号已复制，打开微信添加朋友即可。')
    } catch {
      setNotice('当前浏览器无法复制，请手动复制上方微信号。')
    }
  }
  const download = async () => {
    setBusy(true)
    try {
      const response = await fetch(contact.wechatQr)
      if (!response.ok) throw new Error()
      const file = await response.blob()
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type]
      if (!extension) throw new Error()
      const url = URL.createObjectURL(file),
        link = document.createElement('a')
      link.href = url
      link.download = `荧耀站外-微信二维码.${extension}`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setNotice('已下载二维码，也可以长按图片保存，再到微信中识别。')
    } catch {
      setNotice('图片未能下载，请重试或长按图片保存。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <div className="wechat-actions">
        {contact?.wechat && (
          <button type="button" onClick={copy}>
            <Copy size={14} aria-hidden="true" />
            复制微信号
          </button>
        )}
        {contact?.wechatQr && (
          <button type="button" disabled={busy} onClick={download}>
            <Download size={14} aria-hidden="true" />
            {busy ? '下载中…' : '保存二维码'}
          </button>
        )}
      </div>
      {notice && (
        <p className="wechat-notice" role="status">
          {notice}
        </p>
      )}
    </>
  )
}

export default function WechatDialog({ contact, onClose }) {
  const { data, error, loading, refresh } = useHomeSummary()
  const details = data?.contact || contact
  const ref = useRef(null),
    [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [details?.wechatQr])
  useEffect(() => {
    const dialog = ref.current,
      opener = document.activeElement,
      overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      className="wechat-dialog"
      ref={ref}
      aria-labelledby="wechat-dialog-title"
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key !== 'Tab') return
        const controls = [...ref.current.querySelectorAll('button:not(:disabled), a[href]')].filter(
          (el) => el.getClientRects().length
        )
        const first = controls[0],
          last = controls.at(-1)
        if (!first) return
        if (
          event.shiftKey &&
          (document.activeElement === first || !ref.current.contains(document.activeElement))
        ) {
          event.preventDefault()
          last.focus()
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !ref.current.contains(document.activeElement))
        ) {
          event.preventDefault()
          first.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="wechat-dialog-content">
        <header>
          <div>
            <span>荧耀站外 · 微信咨询</span>
            <h2 id="wechat-dialog-title">联系荧耀站外</h2>
          </div>
          <button type="button" aria-label="关闭微信咨询" onClick={onClose}>
            <X size={20} />
          </button>
        </header>
        <p>
          准备产品链接、目标市场与预算，
          <br />
          我们一起确认渠道、费用和排期。
        </p>
        {details?.wechatQr && !failed ? (
          <img
            className="wechat-dialog-image"
            src={details.wechatQr}
            alt="荧耀站外顾问微信二维码"
            width="240"
            height="240"
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="wechat-dialog-empty">
            <QrCode size={44} aria-hidden="true" />
            <span>
              {loading && !details ? '正在读取联系方式…' : failed ? '二维码暂时无法加载' : details?.wechat ? '微信二维码待更新' : '联系方式更新中'}
            </span>
          </div>
        )}
        {details?.wechat && <p className="wechat-dialog-account">微信号：{details.wechat}</p>}
        {details?.wechatQr && !failed && <small>微信扫一扫，或保存图片后在微信中识别</small>}
        <WechatActions contact={details} />
        {(error || failed) && (
          <div className="wechat-retry" role="status">
            <span>{error || '请重新加载二维码'}</span>
            <button
              type="button"
              onClick={() => {
                setFailed(false)
                refresh()
              }}
              disabled={loading}
            >
              重试
            </button>
          </div>
        )}
      </div>
    </dialog>
  )
}
