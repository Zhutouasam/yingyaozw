import React, { useEffect, useRef, useState } from 'react'
import './hero-resources.css'

// Images are the existing resource-directory assets, rather than customer case studies.
const columns = [
  [
    { name: 'goglitchdeals', label: '红人资源', image: 'ID_1363D28CB74D4634BC68F500EC282780.jpeg', photo: true },
    { name: 'Facebook', label: '群组推广', platform: 'facebook', mark: 'f' },
    { name: 'pricedropclub', label: '红人资源', image: 'ID_5E03E5B365D548FCADBC3BFF1C4B734C.jpeg' },
    { name: 'DealSeek', label: 'Deal 站资源', platform: 'dealseek', mark: 'D' },
    { name: 'mikedailydeals', label: '红人资源', image: 'ID_52EC0796202F4051917C95A0F971B388.jpeg' }
  ],
  [
    { name: 'Instagram', label: '内容与红人', platform: 'instagram' },
    { name: 'jfauskee', label: '红人资源', image: 'ID_649561C412E34B58AF4F46637D85F23B.jpeg', photo: true },
    { name: 'Slickdeals', label: 'Deal 站资源', platform: 'slickdeals', mark: 'sd' },
    { name: 'davidamazondeals', label: '红人资源', image: 'ID_328C7C5B6BEC430589DFDEBCAE8FF805.jpeg' },
    { name: 'Telegram', label: 'TG 渠道', platform: 'telegram', mark: 'TG' }
  ],
  [
    { name: 'austinsdeals', label: '红人资源', image: 'ID_6AA53512980541699C79B7CB2E5F7AC4.jpeg', photo: true },
    { name: 'YouTube', label: '红人视频', platform: 'youtube' },
    { name: 'quinndeals', label: '红人资源', image: 'ID_9F0FD59EF4E94FB5876E69D5A8CC55D5.jpeg' },
    { name: 'CP deals', label: 'Deal 站资源', platform: 'cpdeals', mark: 'CP' },
    { name: 'mikesdealfinder', label: '红人资源', image: 'ID_3FCDF4D5611849E3AF36D06B3252203F.jpeg' }
  ]
]

function ResourceCard({ resource }) {
  return (
    <div className={`hero-resource-card ${resource.photo ? 'resource-photo-card' : ''}`}>
      {resource.image ? (
        <img
          className={resource.photo ? 'resource-photo' : 'resource-avatar'}
          src={`/assets/influencers/${resource.image}`}
          alt=""
          width={resource.photo ? 124 : 28}
          height={resource.photo ? 86 : 28}
          decoding="async"
          draggable="false"
        />
      ) : (
        <span className={`resource-platform resource-platform-${resource.platform}`}>
          {resource.platform === 'instagram' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
            </svg>
          ) : resource.platform === 'youtube' ? (
            <svg width="22" height="18" viewBox="0 0 24 18" fill="currentColor">
              <rect x="1" y="1" width="22" height="16" rx="5" />
              <path d="M10 5.5 16 9l-6 3.5Z" fill="white" />
            </svg>
          ) : resource.mark}
        </span>
      )}
      <div className="resource-card-copy">
        <strong>{resource.name}</strong>
        <span>{resource.label}</span>
      </div>
    </div>
  )
}

export default function HeroResources() {
  const container = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    let inView = false
    const update = () => setVisible(inView && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting
      update()
    })
    observer.observe(container.current)
    document.addEventListener('visibilitychange', update)
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [])

  return (
    <figure className="hero-resources" ref={container} data-running={visible}>
      <div className="resource-art-heading">
        <span className="resource-art-brand">
          <img src="/assets/yingyao-logo-nav.jpg" alt="" width="28" height="28" />
          <span>荧耀站外 · 渠道资源</span>
        </span>
      </div>
      <div className="resource-art-viewport" aria-hidden="true">
        <div className="resource-art-lanes">
          {columns.map((resources, column) => (
            <div className={`resource-art-track ${column === 1 ? 'resource-art-track-reverse' : ''} ${column === 2 ? 'resource-art-track-third' : ''}`} key={column}>
              {[0, 1].map((copy) => (
                <div className="resource-art-set" key={copy}>
                  {resources.map((resource) => <ResourceCard resource={resource} key={resource.name} />)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <figcaption className="resource-art-caption">
        <span><i />群组 · 红人 · Deal 站</span>
        <span>连接产品与海外市场</span>
      </figcaption>
    </figure>
  )
}
