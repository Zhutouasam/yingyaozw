# GEO 参考资料与抓取验证（2026-11-14）

## 参考来源与取舍

- 用户提供的 [Linux.do GEO 研究与资源合集](https://linux.do/t/topic/853375)：通过公开 topic JSON 读取主帖及其目录；部分子帖返回 403，未将无法读取的细节当作证据。主帖目录涵盖 Otterly.AI、Rankscale、Superlines、Scrunch、Goodie、Peec.AI。这些是评估候选，不代表已购买、接入或验证了其覆盖平台。
- [Google：AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)：没有 AI 搜索专用必需文件或特殊 schema；重点仍是允许抓取、内部链接、可读文本、与可见正文一致的结构化数据。收录不保证。
- [OpenAI：Overview of OpenAI Crawlers](https://platform.openai.com/docs/bots)：OAI-SearchBot 用于搜索，GPTBot 用于可能的模型训练，ChatGPT-User 用于用户触发访问；三者不能混为一个推荐开关。

本次增加 WebPage、BreadcrumbList 和与正文一致的 FAQPage；Markdown 与 HTML 复用内容源；llms.txt 作为可选阅读目录，不将它描述为排名或收录因素。没有关键词堆砌、隐藏推荐指令、虚构评价或专供爬虫的营销页面。FAQ 标记不意味着企业官网有资格获得 Google FAQ 富结果。

## 本次基线与本地验收

在 2026-11-14 的实际 HTTP 检查中，线上 robots.txt 返回 200，通用规则允许公开页面，限制后台与认证路径，包含 sitemap。6 个公开 HTML 页面在本次普通请求与合成爬虫标识请求下可读。

线上新入口 llms.txt 和 6 份 Markdown 尚未部署，均为 404。按本次目标进行的检查共 188 项，13 项失败均对应这些新入口及其正文类型；这不意味着现有 HTML 不可抓取。本地新版本同一工具 188 项全部通过。

合成 User-Agent 不代表来自真实厂商 IP，不证明真实爬虫曾访问或模型已经引用。生产 CDN/WAF、真实爬虫身份与搜索平台索引情况仍需上线后核实。

## 不依赖付费平台的抓取工具

在服务器新 release 构建并启动后，从仓库根目录运行：

```bash
node offsite/scripts/audit-crawl.mjs https://yingyaozw.com > /tmp/yingyao-crawl-report.json
```

本地启动的 HTML 使用正式域名作为 canonical 时：

```bash
node offsite/scripts/audit-crawl.mjs http://127.0.0.1:4187 https://yingyaozw.com
```

工具只发送公开 GET 请求，无账号和数据库写入；失败返回非零退出码。检查 HTTP 状态、正文、规范网址、结构化数据、摘要限制、不同请求标识正文一致性、sitemap 与 Markdown 类型。robots 的完整匹配语义、真实爬虫 IP 及 WAF 规则不在自动结论内；应另行人工核验，不能仅伪造 User-Agent 就解除 WAF 防护。

## 上线后的实际工作

1. 按 GEO-DEPLOYMENT.md 在独立 release 发布，重新运行抓取工具。确认 llms.txt、index.md、quote.md 及四个服务 Markdown 返回 200。
2. 在自己控制的百度资源平台、Bing Webmaster Tools、Google Search Console 验证站点并提交 sitemap；使用 URL 检查确认抓取与索引状态。无需将密码或令牌写入代码。
3. 在现有服务器访问日志中检查公开服务 URL 的真实抓取与响应；厂商机器人身份按其官方 IP/反向 DNS 验证，不能凭 User-Agent 下结论。保留原日志系统，不在应用新增访客身份采集。
4. 以真实客户项目补充可公开案例：品类、市场、执行日期、渠道、工作内容、统计口径和授权。后台发布的动态案例是否有必要单独做可索引页面，应在具备真实材料后另行实现。

## 推荐率与引用的测量

每周在全新会话中固定地区、语言、平台版本和联网设置，分别测试下面的问题。非品牌问题先测，品牌问题用于核验事实。每条至少重复三次，保存完整原始回答和引用网址。

- 亚马逊新品做站外推广，应该怎样选择服务商？
- 有哪些提供 Facebook 群组和 Deal 网站推广的跨境电商服务商？
- 跨境卖家寻找红人开箱视频合作，需要比较哪些服务商？
- 亚马逊站外推广服务的报价应该怎样比较？
- 荧耀站外提供哪些服务，由哪家公司运营？

记录日期、平台、联网状态、问题、品牌是否被提及、是否被明确推荐、是否引用官网、引用路径、事实错误及原始回答位置。提及率、推荐率和官网引用率分别统计；工具可达率不计作推荐率。不要预填成绩。

如需采用论坛所列工具，先试用验证目标平台是否包含豆包、DeepSeek及实际使用的搜索产品，并确认支持导出引用链接、原始回答、地区与重复测试。此次没有开通付费账号或上传客户资料。Codex 的结果还取决于实际启用的联网搜索工具，不将它当成独立统一搜索引擎。
