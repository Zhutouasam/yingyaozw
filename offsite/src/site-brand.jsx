import React from 'react'
import './theme.css'

export default function SiteBrand({ className = '', subtitle = 'YINGYAO OFFSITE' }) {
  return (
    <a className={`site-brand ${className}`} href="/" aria-label="荧耀站外 · 返回首页">
      <span className="site-brand-mark">
        <img src="/assets/yingyao-logo-nav.jpg" alt="" width="59" height="42" />
      </span>
      <span className="site-brand-type">
        <strong>荧耀站外</strong>
        <small className={subtitle === 'YINGYAO OFFSITE' ? undefined : 'site-brand-caption'}>
          {subtitle}
        </small>
      </span>
    </a>
  )
}
