# GEO 服务器部署与验收

本仓库用于服务器部署。`offsite/` 包含可构建源码与当前构建产物；`shared/` 是 Node 路由、页面内容和构建脚本的共同依赖，部署时必须包含整个 `offsite/`，不能只替换 `server/`。

## 本次范围

首页增加真实公司主体、服务链接与采购问答；新增四个服务详情页；报价页先返回静态服务说明，再从现有 API 载入实时价格；增加 Organization、WebSite 和各服务页 Service 数据；构建时生成 sitemap，保持后台限制。没有新增依赖或数据库变更，不修改 Nginx、systemd 或其他项目配置。

公开入口：`/`、`/quote`、`/services/amazon-offsite/`、`/services/facebook-groups/`、`/services/influencer-video/`、`/services/pr-media/`。报价查询参数不进入 canonical。服务页省略尾斜杠和报价页多余尾斜杠会 308 跳转，保留查询参数。

## 在新 release 目录构建

使用 Node.js 24+。先核对实际部署目录、Git 状态、服务名、运行用户及数据路径；有本地改动先保护。不要在运行中的 current 目录边构建边对外服务，避免新旧资源混用。

```bash
cd /path/to/new-release/offsite
npm ci --ignore-scripts
PUBLIC_ORIGIN=https://yingyaozw.com npm run build
npm run test:backend
```

`PUBLIC_ORIGIN` 缺省为正式域名。测试环境使用自己的真实域名构建时，检查生成的 canonical、JSON-LD、sitemap、robots 是否一致。当前抓取集成测试以正式域名构建作为固定验收环境。

仓库包含部署用 `dist/`。修改源码后必须重新运行上述构建，不能因拉取成功就假定产物已经更新。`npm run preview` / `npm run dev` 仅用于开发；本次服务页路由、跳转及抓取验收以 `npm start` 的 Node 服务为准。

## 切换生产前

1. 核对 `deploy/yingyao-offsite.service` 与真实服务配置。原配置使用 `/opt/yingyao-offsite/current`，数据库独立位于 `/opt/yingyao-offsite/data/pricing.sqlite`。这些路径要以服务器实际配置为准。
2. 记录原 current 指向，备份真实运行数据。数据库在运行时应使用 SQLite 一致性备份，不能只拷贝正在写入的主文件而忽略 WAL。
3. 将完整新 release 放在独立目录，保留生产环境变量与数据路径；不要复制本地测试库，亦不要把 `.env` 提交 Git。
4. 由服务器管理员按现有发布流程切换 current 到新 release 并重启真实服务。需要确保服务用户能读取 shared、dist、server，且仅私有数据目录可写。
5. 回滚时将 current 切回记录的旧 release 并重启。本次没有数据库迁移；回滚不会恢复外部系统已进行的写入，不要用旧测试数据库覆盖生产数据。

## 上线检查

```bash
curl -I https://yingyaozw.com/
curl -I https://yingyaozw.com/quote
curl -I https://yingyaozw.com/services/amazon-offsite/
curl -I https://yingyaozw.com/services/amazon-offsite
curl -I https://yingyaozw.com/admin
curl -fsS https://yingyaozw.com/sitemap.xml
curl -fsS https://yingyaozw.com/robots.txt
```

实际抓取 HTML 正文检查公司名、各页唯一 title、自身 canonical、JSON-LD。检查资源响应正常、报价可加载、询价单可加入、咨询入口使用真实后台配置；API 不可用时应保留服务说明。未知 URL 应返回 404。浏览器端与不执行 JavaScript 的页面均应能理解业务。

## 上线后的 GEO 工作

站长平台验证和 sitemap 提交需使用真实百度/Bing/Google账号；本次未代办。新增页面不代表已被索引或推荐。使用新会话、固定联网模式，在 DeepSeek、豆包及实际使用的 Codex 搜索工具中测试相同非品牌问题，并保存真实引用链接。

企业与服务事实采用负责人提供的公司名称及既有官网业务。没有虚构案例、评价、获奖、地址、电话或平台认证。实际联系方式和案例仍由原后台维护，本次没有凭空填充。后续经授权补充可核验案例及一致的行业资料，是内容与外部信誉工作，无法仅由一次代码更新完成。

## 2026-11-14 抓取增强

构建额外生成 `llms.txt`、`index.md`、`quote.md` 和四份 `services/*/index.md`，服务端为 Markdown 返回 `text/markdown`。这些是辅助阅读入口，HTML 正文仍是主要公开内容。源码及产物需一起部署；没有数据库迁移或依赖变化。

上线后在仓库根目录运行 `node offsite/scripts/audit-crawl.mjs https://yingyaozw.com`，并按 [参考资料与验证记录](GEO-REFERENCE-20261114.md) 完成真实抓取、索引与引用检查。
