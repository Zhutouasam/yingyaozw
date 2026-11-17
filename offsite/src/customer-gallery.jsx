import React, { lazy, Suspense, useEffect, useRef, useState } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { ArrowLeft, ArrowRight, ArrowUpRight, Images, Scan } from 'lucide-react'
import './customer-gallery.css'

const FeedbackLightbox = lazy(() => import('./feedback-lightbox.jsx'))

function useFeedbackCarousel() {
  const [viewportRef, api] = useEmblaCarousel({ loop: true, align: 'start' })
  const [selected, setSelected] = useState(0)
  useEffect(() => {
    if (!api) return
    const update = () => setSelected(api.selectedScrollSnap())
    update()
    api.on('select', update).on('reInit', update)
    return () => { api.off('select', update).off('reInit', update) }
  }, [api])
  return { viewportRef, api, selected }
}

function FeedbackCard({ item, number, onOpen }) {
  return <article className="feedback-slide" aria-label={`${number + 1}：${item.title}`}>
    <button type="button" className="feedback-card" aria-label={`放大查看：${item.title}`} onClick={onOpen}>
      <span className="feedback-image">
        <img src={item.image} alt={item.alt || item.title} loading="lazy" decoding="async" width="480" height="600" />
        <span className="feedback-expand"><Scan size={18} aria-hidden="true" /></span>
      </span>
      <span className="feedback-caption">
        <span className="feedback-card-meta"><span>{item.category || '合作反馈'}</span>
          <small>{String(number + 1).padStart(2, '0')}</small></span>
        <strong>{item.title}</strong>
        <span className="feedback-card-link">查看完整长图 <ArrowUpRight size={14} aria-hidden="true" /></span>
      </span>
    </button>
  </article>
}

function GalleryControls({ api, selected, count }) {
  return <div className="feedback-controls" role="group" aria-label="反馈相册切换">
    <span className="feedback-position" aria-live="polite" aria-atomic="true">
      <strong>{String(selected + 1).padStart(2, '0')}</strong> / {String(count).padStart(2, '0')}
    </span>
    <button type="button" aria-label="上一组客户反馈" aria-controls="feedback-carousel"
      disabled={count < 2} onClick={() => api?.scrollPrev()}><ArrowLeft size={18} /></button>
    <button type="button" aria-label="下一组客户反馈" aria-controls="feedback-carousel"
      disabled={count < 2} onClick={() => api?.scrollNext()}><ArrowRight size={18} /></button>
  </div>
}

export default function CustomerGallery({ items = [] }) {
  const [index, setIndex] = useState(-1)
  const opener = useRef(null)
  const { viewportRef, api, selected } = useFeedbackCarousel()
  if (!items.length) return <div className="feedback-empty">
    <Images size={30} aria-hidden="true" /><p>客户沟通截图整理中</p>
  </div>
  return <div className="feedback-gallery" role="region" aria-label="客户沟通与推广反馈相册" aria-roledescription="轮播">
    <div className="feedback-gallery-note">
      <span><Images size={16} aria-hidden="true" /> {items.length} 份客户沟通记录</span>
      <span>左右滑动浏览 · 点击放大长图</span>
    </div>
    <div id="feedback-carousel" className="feedback-viewport" ref={viewportRef} tabIndex={0}
      aria-label="客户反馈图片，使用左右方向键切换" onKeyDown={(event) => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return
        event.preventDefault()
        if (event.key === 'ArrowLeft') api?.scrollPrev(); else api?.scrollNext()
      }}>
      <div className="feedback-track">
        {items.map((item, number) => <FeedbackCard key={item.id} item={item} number={number}
          onOpen={(event) => { opener.current = event.currentTarget; setIndex(number) }} />)}
      </div>
    </div>
    <div className="feedback-gallery-footer">
      <span className="feedback-footer-hint">发布跟进 / 推广回访 / 持续沟通</span>
      <GalleryControls api={api} selected={selected} count={items.length} />
    </div>
    <p className="feedback-disclaimer">截图为客户个案沟通记录，推广表现受产品、折扣、渠道与时间等因素影响。</p>
    {index >= 0 && <Suspense fallback={<p role="status" className="feedback-loading">正在打开原图…</p>}>
      <FeedbackLightbox items={items} index={index} onClose={() => {
        setIndex(-1)
        opener.current?.focus({ preventScroll: true })
      }} />
    </Suspense>}
  </div>
}
