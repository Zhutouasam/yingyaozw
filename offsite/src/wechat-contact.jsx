import React, { useEffect, useState } from 'react'
import { MessageCircle, QrCode } from 'lucide-react'
import WechatDialog, { WechatActions } from './wechat-dialog.jsx'

export default function WechatContact({ contact }) {
  const [failed, setFailed] = useState(false)
  const [open, setOpen] = useState(false)
  const source = contact?.wechatQr
  useEffect(() => setFailed(false), [source])
  const hasImage = source && !failed
  return (
    <aside id="wechat" className={`wechat-contact ${source ? '' : 'wechat-contact-pending'}`} aria-labelledby="wechat-contact-title">
      <div className="wechat-contact-copy">
        <span className="wechat-contact-label">
          <MessageCircle size={16} aria-hidden="true" /> 微信咨询
        </span>
        <h3 id="wechat-contact-title">
          {hasImage ? '扫码加微信，聊聊你的产品。' : '带上产品信息，聊聊推广。'}
        </h3>
        <p>
          带上产品链接、目标市场和预算，
          <br />
          一起找到适合你的推广渠道。
        </p>
        {contact?.wechat && <span className="wechat-contact-account">微信号：{contact.wechat}</span>}
        <WechatActions contact={contact} />
      </div>
      <figure className="wechat-contact-code">
        <div className="wechat-code-frame">
          {hasImage ? (
            <button
              className="wechat-code-button"
              type="button"
              aria-label="放大微信二维码"
              onClick={() => setOpen(true)}
            >
              <img
                src={source}
                alt="荧耀站外顾问微信二维码"
                width="176"
                height="176"
                loading="lazy"
                onError={() => setFailed(true)}
              />
            </button>
          ) : (
            <div className="wechat-code-empty">
              <QrCode size={28} strokeWidth={1.3} aria-hidden="true" />
              <span>{failed ? '二维码暂时无法加载' : contact?.wechat ? '微信二维码待更新' : '联系方式更新中'}</span>
              {failed && (
                <div className="wechat-retry">
                  <button type="button" onClick={() => setFailed(false)}>
                    重试二维码
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <figcaption>{hasImage ? '微信扫一扫 · 手机端长按识别' : '荧耀站外 · 合作咨询'}</figcaption>
      </figure>
      {open && <WechatDialog contact={contact} onClose={() => setOpen(false)} />}
    </aside>
  )
}
