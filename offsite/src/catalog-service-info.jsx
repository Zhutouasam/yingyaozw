import React from 'react'
import { company, servicePages, servicePath } from '../shared/public-content.mjs'
import './catalog-service-info.css'

export default function CatalogServiceInfo() {
  return (
    <section className="catalog-service-info container" aria-labelledby="quote-service-info">
      <h2 id="quote-service-info">推广服务与合作说明</h2>
      <p>荧耀站外由{company}运营，提供海外群组、Deal网站、红人视频、PR媒体及亚马逊周边服务。</p>
      <p>根据产品品类和市场比较渠道，核对折扣、发布门槛、费用与排期。询价时请提供产品链接、品类、市场、预算和上线时间；寄样、产品折扣及素材使用等费用须逐项确认。</p>
      <nav aria-label="了解推广服务">
        {servicePages.map(page => <a key={page.slug} href={servicePath(page)}>{page.title}</a>)}
      </nav>
    </section>
  )
}
