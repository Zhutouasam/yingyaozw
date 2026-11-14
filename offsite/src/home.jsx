import { homeDescription, procurementFaqs, servicePages, servicePath } from '../shared/public-content.mjs'
import React, { useEffect, useState } from 'react'
import { ArrowUpRight, Plus, Megaphone, Video, Newspaper, Store } from 'lucide-react'
import CaseWall from './case-wall.jsx'
import SiteBrand from './site-brand.jsx'
import WechatContact from './wechat-contact.jsx'
import WechatDialog from './wechat-dialog.jsx'
import useHomeSummary from './use-home-summary.js'
import HeroResources from './hero-resources.jsx'
import './home.css'

const services = [
  {
    id: 'promotion',
    icon: Megaphone,
    number: '01',
    title: '站外推广',
    desc: '根据品类和目标市场，筛选群组、Deal 站与博主。确认受众、折扣要求和预算后安排推广。',
    links: [
      ['美国群组 / Deal 站', 'us'],
      ['其他国家', 'eu'],
      ['IG / TK 博主', 'tkins'],
      ['TG 渠道', 'tg'],
      ['独立站', 'standalone'],
      ['速卖通', 'aliexpress']
    ]
  },
  {
    id: 'video',
    icon: Video,
    number: '02',
    title: '红人视频',
    desc: '开箱、体验或使用演示。按产品选择红人，合作前确认寄样、视频形式和素材使用范围。',
    links: [['影响者视频', 'influencerVideo']]
  },
  {
    id: 'media',
    icon: Newspaper,
    number: '03',
    title: 'PR 媒体',
    desc: '新闻稿发布。根据产品主题和受众选择渠道，确认内容要求与发布时间。',
    links: [['新闻稿', 'prnews']]
  },
  {
    id: 'amazon',
    icon: Store,
    number: '04',
    title: '亚马逊周边',
    desc: '店铺周边服务与运营工具。逐项查看费用、适用条件和交付说明。',
    links: [
      ['周边服务', 'service'],
      ['运营工具', 'tool']
    ]
  }
]
const steps = [
  ['告诉我们你的产品', '提供产品链接、品类、市场与预算，说清订单或品牌曝光目标。'],
  ['匹配渠道与方案', '筛选群组受众与发布门槛，结合红人、折扣和上线时间整理方案。'],
  ['确认费用与排期', '逐项确认最终费用、发布时间和交付内容，再安排执行。']
]
const faqs = [...procurementFaqs,
  [
    '第一次做站外推广，应该怎么选？',
    '先明确产品品类、目标市场和预算，再进入报价中心，按分类比较价格、发布要求与排期。点击渠道名称可查看完整合作要求。'
  ],
  [
    '报价包含哪些费用？',
    '以每条报价的服务说明为准，部分渠道使用套餐、区间价或不同币种。合作前还需确认寄样、产品折扣、素材使用等费用，以及最终报价和可用排期。'
  ],
  [
    '询价前需要准备什么？',
    '建议准备产品链接、品类、目标市场、预算和期望上线时间。在报价中心将意向渠道加入询价单，再复制或导出明细，方便后续沟通。最终方案、费用与排期需双方确认。'
  ]
]
const navLinks = [
  ['top', '首页'],
  ['services', '服务'],
  ['quote', '价格表'],
  ['about', '品牌故事'],
  ['cooperation', '如何合作']
]
function Brand() {
  return <SiteBrand className="home-brand" />
}
export default function Home() {
  const { data: catalog, error: homeError, loading, refresh } = useHomeSummary()
  const [active, setActive] = useState('top'),
    [wechatOpen, setWechatOpen] = useState(false)
  useEffect(() => {
    // Cross-page links can arrive before the client-rendered section exists.
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, [])
  useEffect(() => {
    let frame
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const threshold = document.querySelector('.home-header').getBoundingClientRect().bottom + 80
        let current = 'top'
        for (const [id] of navLinks)
          if (document.getElementById(id)?.getBoundingClientRect().top <= threshold) current = id
        setActive(current)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  const linkFor = (id) =>
    catalog && !catalog.categoryMeta.some((category) => category.id === id)
      ? '/quote'
      : `/quote?category=${encodeURIComponent(id)}`
  return (
    <div className="home-shell" id="top">
      <a className="home-skip" href="#home-main">
        跳转到主要内容
      </a>
      <header className="home-header">
        <div className="home-container home-header-inner">
          <Brand />
          <nav aria-label="主页导航">
            {navLinks.map(([id, label]) => (
              <a
                key={id}
                href={id === 'quote' ? '/quote' : `#${id}`}
                aria-current={active === id ? 'location' : undefined}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main id="home-main">
        <section className="home-hero home-container" aria-labelledby="home-title">
          <div className="hero-copy">
            <span className="home-kicker">
              <i />
              美国本土 · 品类匹配 · 定制推广
            </span>
            <h1 id="home-title">
              让好产品，
              <br />
              <span>被更多人看见。</span>
            </h1>
            <p>
              <strong>为你的品类，找到适合的群组与红人。</strong>
              <br />
              从产品、受众与预算出发，定制美国本土站外推广。
              <br className="desktop-break" />
              让小店铺成长，让大品牌被记住。
            </p>
            <div className="hero-actions">
              <a className="home-primary" href="/quote">
                查看渠道报价
                <ArrowUpRight size={18} />
              </a>
              <button
                type="button"
                className="home-text-link hero-consult"
                onClick={() => setWechatOpen(true)}
              >
                微信咨询
                <ArrowUpRight size={16} />
              </button>
            </div>
            <nav className="hero-footnote" aria-label="服务快捷入口">
              {services.map((service) => (
                <a key={service.id} href={`#service-${service.id}`}>
                  {service.title}
                  <ArrowUpRight size={12} />
                </a>
              ))}
            </nav>
          </div>
          <HeroResources />
        </section>
        {homeError && (
          <div className="home-data-error home-container" role="status">
            <span>{homeError}</span>
            <button type="button" disabled={loading} onClick={refresh}>
              {loading ? '正在重试…' : '重新加载'}
            </button>
          </div>
        )}
        <section id="services" className="home-services home-container" aria-labelledby="services-title">
          <header className="home-section-heading">
            <div>
              <span className="home-kicker">01 / 我们的服务</span>
              <h2 id="services-title">推广与运营服务</h2>
            </div>
            <p>
              从品类、市场与预算出发，
              <br />
              再决定如何推广。
            </p>
            <a className="home-text-link services-all-link" href="/quote">
              全部渠道报价
              <ArrowUpRight size={16} />
            </a>
          </header>
          <nav className="hero-footnote" aria-label="服务详细介绍">
            {servicePages.map(page => <a key={page.slug} href={servicePath(page)}>{page.title}</a>)}
          </nav>
          <div className="home-service-list">
            {services.map((service) => (
              <article className="home-service-row" id={`service-${service.id}`} key={service.id}>
                <span className="home-service-number">
                  <service.icon size={20} aria-hidden="true" />
                  <span>{service.number}</span>
                </span>
                <div className="home-service-title">
                  <h3>{service.title}</h3>
                </div>
                <div className="home-service-copy">
                  <p>{service.desc}</p>
                  <ul aria-label={`${service.title}报价分类`}>
                    {service.links
                      .filter(
                        ([, id]) => !catalog || catalog.categoryMeta.some((category) => category.id === id)
                      )
                      .map(([label, id]) => (
                        <li key={id}>
                          <a href={linkFor(id)}>
                            {label}
                            <ArrowUpRight size={12} />
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section id="about" className="home-about" aria-labelledby="about-title">
          <div className="home-container about-inner">
            <div className="story-heading">
              <span className="home-kicker">02 / 品牌故事</span>
              <h2 id="about-title">
                从一线出发，
                <br />
                <span>为客户而创业。</span>
              </h2>
              <div className="about-signature">
                <span />
                荧耀站外 · YINGYAO OFFSITE
              </div>
            </div>
            <div className="about-copy">
              <p>{homeDescription}</p>
              <p className="about-introduction">
                从销售与运营一线，
                <br />
                走向我们自己的事业。
              </p>
              <p>
                对接客户时，我们发现：群组质量参差不齐，产品与受众也缺少品类匹配。好产品，没能遇见合适的买家。
              </p>
              <p>
                因此，我们决定独立创业，成立荧耀站外。为客户寻找优质群组，连接美国本土红人，定制更贴合产品的推广方案。
              </p>
              {catalog?.case && (
                <div className="story-result">
                  <span>{catalog.case.category} · 客户案例</span>
                  <p>
                    {catalog.case.metric}增长 <strong>{catalog.case.growth}%</strong>
                  </p>
                  <small>统计周期：{catalog.case.period}</small>
                  <details>
                    <summary>查看案例说明</summary>
                    <p>{catalog.case.source}</p>
                    <small>单个案例表现，不代表所有产品的推广结果。</small>
                  </details>
                </div>
              )}
              <details className="story-full">
                <summary>
                  读完整品牌故事
                  <Plus size={16} />
                </summary>
                <p>
                  这些经历，让我们决定带着销售与运营一线的经验，专门为客户做定制化站外推广，解决渠道质量与品类匹配的痛点。
                </p>
                <p>
                  我们根据客户的品类寻找优质群组，在美国本土的不同渠道连接红人与社群，围绕产品、目标买家和推广需求制定方案，让产品触达更合适的人群。
                </p>
                <p>
                  让每一个客户的店铺如一颗颗萤火，点亮美国本土市场；让大品牌走进更多买家的视野，让小店铺也能与皓月争光。这是我们的愿景，也是持续努力的方向。
                </p>
              </details>
            </div>
            <div className="brand-visions" aria-label="品牌愿景与努力方向">
              <article className="brand-vision">
                <span className="home-kicker">为大品牌 · 持续被看见</span>
                <h3>
                  星星之火，<span>可以燎原。</span>
                </h3>
                <p>通过红人、群组与本土渠道持续曝光，在一次次触达中留下品牌印象，逐步积累影响力。</p>
              </article>
              <article className="brand-vision">
                <span className="home-kicker">为小品牌 · 积累成长的底气</span>
                <h3>
                  萤火，也能<span>与皓月争光。</span>
                </h3>
                <p>
                  以品类匹配与优质渠道，帮助小店铺争取更多订单、改善利润，逐步拥有与大店铺同场竞争的能力。
                </p>
              </article>
            </div>
          </div>
        </section>
        <section id="cases" className="home-cases home-container" aria-labelledby="cases-title">
          <header className="home-section-heading">
            <div>
              <span className="home-kicker">03 / 客户案例</span>
              <h2 id="cases-title">客户沟通与推广反馈</h2>
            </div>
            <p>
              客户沟通与推广反馈，
              <br />
              陆续更新。
            </p>
          </header>
          <CaseWall items={catalog?.caseImages} />
        </section>
        <section id="cooperation" className="home-process home-container" aria-labelledby="process-title">
          <header className="home-section-heading">
            <div>
              <span className="home-kicker">04 / 如何合作</span>
              <h2 id="process-title">合作流程</h2>
            </div>
            <a className="home-text-link" href="/quote">
              选择推广渠道
              <ArrowUpRight size={17} />
            </a>
          </header>
          <ol>
            {steps.map(([title, desc], index) => (
              <li key={title}>
                <span className="process-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </li>
            ))}
          </ol>
          <div className="matching-note">
            <strong>每次匹配，先核对这三件事</strong>
            <span>受众与品类是否契合</span>
            <span>产品是否符合发布门槛</span>
            <span>预算与排期是否适合</span>
          </div>
          <WechatContact contact={catalog?.contact} />
        </section>
        <section className="home-faq home-container" aria-labelledby="faq-title">
          <div>
            <span className="home-kicker">常见问题</span>
            <h2 id="faq-title">合作前的几个问题</h2>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer], index) => (
              <details key={question}>
                <summary>
                  <span className="faq-number">0{index + 1}</span>
                  <span className="faq-question">{question}</span>
                  <Plus size={18} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section id="contact" className="home-invitation home-container" aria-labelledby="invitation-title">
          <div>
            <span className="home-kicker">浏览价格表</span>
            <h2 id="invitation-title">
              先看渠道，<span>再谈方案。</span>
            </h2>
            <p>
              比较价格与合作要求，把适合产品的渠道加入询价单。
            </p>
          </div>
          <div className="invitation-action">
            <a className="home-primary" href="/quote">
              查看渠道报价
              <ArrowUpRight size={20} />
            </a>
            <span>筛选渠道，整理你的询价单</span>
          </div>
        </section>
      </main>
      <footer className="home-footer home-container">
        <div className="home-footer-top">
          <Brand />
          <p>让好产品，被更多人看见。</p>
          <nav aria-label="页脚导航">
            <a href="#about">品牌故事</a>
            <a href="#services">服务介绍</a>
            <a href="/quote">渠道报价</a>
            <a href="/buyer-qa/">买家问答</a>
          </nav>
        </div>
        <div className="home-footer-bottom">
          <span>© {new Date().getFullYear()} 深圳市荧耀科技有限公司 · 荧耀站外</span>
          <span>参考报价与合作条件，以执行前确认为准。</span>
        </div>
      </footer>
      {wechatOpen && <WechatDialog contact={catalog?.contact} onClose={() => setWechatOpen(false)} />}
    </div>
  )
}
