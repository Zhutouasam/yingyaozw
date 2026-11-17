# 客户沟通与推广反馈素材更新

本次使用 Embla Carousel React 8.6.0（单行循环轮播）和 Yet Another React Lightbox
3.33.1（原图查看、缩放、触摸切换、计数与说明），均为 MIT 许可：

- https://github.com/davidjerleke/embla-carousel
- https://github.com/igordanchenko/yet-another-react-lightbox

首页以固定高度的单行卡片展示局部预览，图片增加不会增加行数。电脑端并排展示四张，手机端展示一张并露出下一张；支持触摸滑动、鼠标拖动、左右按钮和方向键切换。点击后展示完整原图，支持放大、拖动、左右切换与 Esc 关闭。
原图查看组件按需加载。原始 10 张客户截图与微信二维码保存在
`public/assets/customer-feedback-20261117/`，保留用户提供的打码和图片内容。
`scripts/customer-feedback-20261117.json` 记录截图标题、品类与对应沟通摘要。
截图数据为客户个案反馈，不视为后台核验销量或业绩承诺。

## 更新内容数据

二维码与相册由现有后台数据库管理，仅更新代码不会自动写入正式数据库。
在应用目录执行以下命令，显式指定需要更新的数据库：

```sh
node scripts/import-customer-feedback.mjs --db /absolute/path/pricing.sqlite
```

导入前校验所有图片；已有数据库会通过 SQLite backup 创建带时间戳的完整快照。
导入仅替换二维码及更新本批次同标题、同品类的案例，不清空原有相册，不改微信号、
邮箱、报价和其他首页设置。重复执行不会重复创建案例或更新未改变的记录。
后续仍可通过现有后台管理这些图片。

新环境可使用 `server/data/pricing.sqlite` 作为本地数据库路径。正式环境应使用
`PRICING_DB_PATH` 所指向的现有数据库，先确认备份路径具有写权限。
部署需要同时更新前端构建产物并执行一次内容导入；本次本地修改不包含线上部署。
