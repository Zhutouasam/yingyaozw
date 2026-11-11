import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Images, Pause, Play, X } from 'lucide-react'
import { caseImages } from './home-cases.js'

const placeholders = [{
  id: 'case-empty',
  title: '客户沟通与推广反馈',
  image: ''
}]
const wrap = (value, cycle) => cycle + ((((value - cycle) % cycle) + cycle) % cycle)

export default function CaseWall({ items = caseImages }) {
  const slides = items.length ? items : placeholders
  const canLoop = slides.length > 1
  const copies = canLoop ? Math.max(3, Math.ceil(4 / slides.length) + 2) : 1
  const wallRef = useRef(null),
    dialogRef = useRef(null),
    openerRef = useRef(null)
  const geometryRef = useRef({ step: 0, cycle: 0 })
  const autoFrameRef = useRef(null),
    moveFrameRef = useRef(null)
  const [index, setIndex] = useState(0),
    [preview, setPreview] = useState(null)
  const [paused, setPaused] = useState(false),
    [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false),
    [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false),
    [pageVisible, setPageVisible] = useState(true)
  const autoEnabled = canLoop && !paused && !reducedMotion
  const running = autoEnabled && !hovered && !focused && !preview && visible && pageVisible

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    const updateVisibility = () => setPageVisible(document.visibilityState !== 'hidden')
    updatePreference()
    updateVisibility()
    preference.addEventListener('change', updatePreference)
    document.addEventListener('visibilitychange', updateVisibility)
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting))
    observer.observe(wallRef.current)
    return () => {
      preference.removeEventListener('change', updatePreference)
      document.removeEventListener('visibilitychange', updateVisibility)
      observer.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    const wall = wallRef.current
    const update = () => {
      const { step, cycle } = geometryRef.current
      if (!cycle) {
        setIndex(0)
        return
      }
      const offset = wrap(wall.scrollLeft, cycle)
      if (Math.abs(offset - wall.scrollLeft) > 1) wall.scrollLeft = offset
      const current = Math.round((offset - cycle) / step) % slides.length
      setIndex((previous) => (previous === current ? previous : current))
    }
    const measure = () => {
      cancelAnimationFrame(moveFrameRef.current)
      const previous = geometryRef.current
      const relative = previous.cycle ? (wall.scrollLeft - previous.cycle) / previous.step : 0
      const step = wall.children[1]
        ? wall.children[1].offsetLeft - wall.children[0].offsetLeft
        : wall.clientWidth
      const cycle = canLoop ? step * slides.length : 0
      geometryRef.current = { step, cycle }
      wall.scrollLeft = cycle ? wrap(cycle + relative * step, cycle) : 0
      update()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(wall)
    wall.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      wall.removeEventListener('scroll', update)
      cancelAnimationFrame(moveFrameRef.current)
    }
  }, [slides, canLoop])

  useEffect(() => {
    if (!running) return
    const wall = wallRef.current
    let lastTime,
      cursor = wall.scrollLeft,
      lastWritten = wall.scrollLeft
    const tick = (time) => {
      const { cycle } = geometryRef.current
      if (cycle) {
        if (Math.abs(wall.scrollLeft - lastWritten) > 2) cursor = wall.scrollLeft
        if (lastTime !== undefined) cursor = wrap(cursor + (Math.min(time - lastTime, 64) * 28) / 1000, cycle)
        wall.scrollLeft = cursor
        lastWritten = wall.scrollLeft
      }
      lastTime = time
      autoFrameRef.current = requestAnimationFrame(tick)
    }
    autoFrameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(autoFrameRef.current)
  }, [running])

  useEffect(() => {
    if (!preview) return
    const dialog = dialogRef.current
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      openerRef.current?.focus()
    }
  }, [preview])

  const move = (direction) => {
    setPaused(true)
    cancelAnimationFrame(autoFrameRef.current)
    cancelAnimationFrame(moveFrameRef.current)
    const wall = wallRef.current
    const { step, cycle } = geometryRef.current
    if (!cycle) return
    const from = wall.scrollLeft
    if (reducedMotion) {
      wall.scrollLeft = wrap(from + direction * step, cycle)
      return
    }
    let start
    const tick = (time) => {
      start ??= time
      const progress = Math.min((time - start) / 380, 1)
      wall.scrollLeft = wrap(from + direction * step * (1 - Math.pow(1 - progress, 3)), cycle)
      if (progress < 1) moveFrameRef.current = requestAnimationFrame(tick)
    }
    moveFrameRef.current = requestAnimationFrame(tick)
  }

  return (
    <>
      <ul
        id="case-gallery"
        className={`case-wall ${items.length ? '' : 'case-wall-empty'}`}
        aria-label="客户聊天截图循环相册"
        tabIndex={items.length ? 0 : -1}
        ref={wallRef}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false)
        }}
        onPointerDown={(event) => {
          if (event.pointerType !== 'mouse') setPaused(true)
        }}
        onWheel={(event) => {
          if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) setPaused(true)
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
          event.preventDefault()
          move(event.key === 'ArrowRight' ? 1 : -1)
        }}
      >
        {Array.from({ length: copies }, (_, copy) =>
          slides.map((item, number) => {
            const duplicate = canLoop && copy !== 1
            return (
              <li
                className="case-placeholder"
                key={`${copy}-${item.id}`}
                aria-hidden={duplicate ? true : undefined}
                data-case-index={number}
              >
                {item.image ? (
                  <button
                    className="case-image-button"
                    tabIndex={duplicate ? -1 : 0}
                    aria-label={`放大查看：${item.title}`}
                    onClick={(event) => {
                      openerRef.current = event.currentTarget
                      setPreview(item)
                    }}
                  >
                    <img
                      src={item.image}
                      alt={item.alt || item.title}
                      loading="lazy"
                      decoding="async"
                      width="480"
                      height="640"
                    />
                    <span>查看完整截图</span>
                  </button>
                ) : (
                  <div className="case-placeholder-image">
                    <span className="case-placeholder-icon">
                      <Images size={26} strokeWidth={1.4} aria-hidden="true" />
                    </span>
                    <span>客户沟通截图整理中</span>
                    {!items.length && <small>更新后，可在这里浏览完整截图与推广反馈。</small>}
                  </div>
                )}
                <div className="case-placeholder-caption">
                  <span>
                    {item.title}
                    {item.category && <small className="case-category">{item.category}</small>}
                  </span>
                  <small>{String(number + 1).padStart(2, '0')}</small>
                </div>
                {item.desc && <p className="case-summary">{item.desc}</p>}
              </li>
            )
          })
        )}
      </ul>
      {items.length > 0 && <div className="case-gallery-footer">
        <p>共 {slides.length} 张截图{canLoop ? ' · 循环展示' : ''}</p>
        {canLoop && <div className="case-gallery-controls" role="group" aria-label="案例相册切换">
          <span aria-live={autoEnabled ? 'off' : 'polite'} aria-atomic="true">
            {String(index + 1).padStart(2, '0')} <span aria-hidden="true">/</span>{' '}
            {String(slides.length).padStart(2, '0')}
          </span>
          <button
            type="button"
            aria-label={
              reducedMotion ? '自动滚动已按系统设置关闭' : autoEnabled ? '暂停自动滚动' : '开始自动滚动'
            }
            aria-pressed={autoEnabled}
            disabled={!canLoop || reducedMotion}
            onClick={() => {
              cancelAnimationFrame(moveFrameRef.current)
              setPaused((current) => !current)
            }}
          >
            {autoEnabled ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            type="button"
            aria-label="上一张案例"
            aria-controls="case-gallery"
            disabled={!canLoop}
            onClick={() => move(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="下一张案例"
            aria-controls="case-gallery"
            disabled={!canLoop}
            onClick={() => move(1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>}
      </div>}
      {preview && (
        <dialog
          className="case-preview"
          ref={dialogRef}
          aria-labelledby="case-preview-title"
          onCancel={(event) => {
            event.preventDefault()
            setPreview(null)
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreview(null)
          }}
        >
          <div className="case-preview-content">
            <header>
              <h2 id="case-preview-title">{preview.title}</h2>
              <button type="button" aria-label="关闭案例截图" onClick={() => setPreview(null)}>
                <X size={20} />
              </button>
            </header>
            <img src={preview.image} alt={preview.alt || preview.title} />
            {preview.desc && (
              <p className="case-preview-description">
                {preview.category && `${preview.category} · `}
                {preview.desc}
              </p>
            )}
          </div>
        </dialog>
      )}
    </>
  )
}
