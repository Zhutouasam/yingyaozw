import React from 'react'
import Lightbox from 'yet-another-react-lightbox'
import Zoom from 'yet-another-react-lightbox/plugins/zoom'
import Captions from 'yet-another-react-lightbox/plugins/captions'
import Counter from 'yet-another-react-lightbox/plugins/counter'
import 'yet-another-react-lightbox/styles.css'
import 'yet-another-react-lightbox/plugins/captions.css'
import 'yet-another-react-lightbox/plugins/counter.css'

export default function FeedbackLightbox({ items, index, onClose }) {
  return <Lightbox open index={index} close={onClose} plugins={[Zoom, Captions, Counter]}
    className="feedback-lightbox" controller={{ aria: true }}
    slides={items.map((item) => ({ src: item.image, alt: item.alt || item.title,
      title: item.title, description: item.desc }))}
    carousel={{ preload: 1 }} zoom={{ maxZoomPixelRatio: 2, scrollToZoom: true }}
    captions={{ descriptionMaxLines: 2, showToggle: true }}
    labels={{ Close: '关闭原图', Previous: '上一张反馈', Next: '下一张反馈',
      'Zoom in': '放大截图', 'Zoom out': '缩小截图',
      'Show captions': '显示说明', 'Hide captions': '隐藏说明',
      'Loading...': '正在加载原图…', 'Error loading image': '图片加载失败',
      'Image gallery': '客户反馈原图相册' }} />
}
