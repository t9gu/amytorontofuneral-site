# Lead 追踪系统上线手册（amytorontofuneral.ca）

按本文档从上到下操作一遍，五个 lead 渠道即全部生效。所有"填写位置"都集中在一个文件：**`assets/js/lead.js` 顶部的 `AMY_CONFIG` 配置块**（Worker 的配置在 `worker/wrangler.toml`）。

## 0. 系统总览：每条 lead 如何被证明来自网站

| 渠道 | 来源标记方式 | 收费凭据 |
|---|---|---|
| ① 专属转接电话 | 网站只显示 Twilio 转接号，打进来必然来自网站 | Twilio 通话记录（时间/主叫/时长/录音）+ 每通来电的邮件通知 |
| ② WhatsApp | 点击链接自动预填"我在官网看到…" | 带预填语的消息截图 + GA4 `whatsapp_click` |
| ③ 微信 | 弹窗提示"添加时请备注：官网" | 好友申请备注截图 + GA4 `wechat_qr_view`/`wechat_copy` |
| ④ 预约表单 | 隐藏字段自动附带来源页/UTM/时间 | 每封表单邮件自带完整来源链路 + GA4 `form_submit` |
| ⑤ AI 客服 | 访客在对话中留电话/微信即触发提交 | 带完整对话记录的 lead 邮件 + GA4 `chat_lead` |
| ⑥ 邮件 | mailto 自动加"【官网咨询】"主题前缀 | 邮件主题前缀 + GA4 `email_click` |

月底对账：GA4 报表（各事件数）+ Twilio 通话记录 + lead 邮件存档，三方互相印证。

---

## 1. Web3Forms（表单 & 所有邮件通知的投递通道，5 分钟）

1. 打开 https://web3forms.com ，输入**接收 lead 的邮箱**（建议用你自己的存档邮箱，再在邮箱里设置自动转发给 Amy；或直接填 Amy 的邮箱），获取 **Access Key**（免费 250 封/月）。
2. 把 Key 填到两处：
   - `assets/js/lead.js` → `web3formsKey: "填这里"`
   - `worker/wrangler.toml` → `WEB3FORMS_KEY = "填这里"`

> 填好后：预约表单立即可用（不依赖 Worker）。

## 2. GA4 统计（10 分钟）

1. https://analytics.google.com → 创建媒体资源 → 网站 → 得到衡量 ID（`G-XXXXXXXXXX`）。
2. 填到 `assets/js/lead.js` → `ga4Id: "G-XXXXXXXXXX"`。
3. 上线后在 GA4「管理 → 事件」里把 `form_submit`、`chat_lead`、`call_click` 标记为**关键事件（转化）**。
4. 验证：GA4 DebugView + 访问网站点一遍各按钮。

事件清单：`call_click` / `whatsapp_click` / `wechat_qr_view` / `wechat_copy` / `form_submit` / `chat_start` / `chat_lead` / `email_click`。

## 3. Twilio 专属转接电话（30 分钟）

1. 注册 https://www.twilio.com （需信用卡），购买一个 **647 或 437 区号**本地号码（约 $1.15 USD/月 + 通话分钟费约 $0.014/分钟）。
2. 创建 TwiML Bin（Console → 搜索 "TwiML Bins" → Create）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="{{你购买的Twilio号码，+1开头}}" record="record-from-answer"
        action="https://amy-leads.你的子域.workers.dev/call-log">
    +16476499188
  </Dial>
</Response>
```

3. Phone Numbers → 你的号码 → Voice Configuration → "A call comes in" 选 **TwiML Bin**，选中上面创建的 Bin，保存。
   - `action` 地址填第 5 步部署好的 Worker 地址；Worker 未部署时可先留掉 `action` 属性，转接照常工作，只是没有邮件通知（Twilio 后台仍有完整通话记录）。
   - `record` 属性开启录音（用作凭据）；安省单方同意录音合法，但建议在 Twilio 加一句 `<Say>` 提示或与客户约定知情。不需要录音就删掉该属性。
4. 拨打转接号测试：应转接到 647-649-9188。
5. 把转接号填到 `assets/js/lead.js`：
   ```js
   trackingNumber: "6471234567",        // 你的 Twilio 号，纯数字
   trackingNumberDisplay: "647-123-4567",
   ```
   填好后，全站所有 `tel:` 链接（含浮动栏、导航、正文按钮）自动替换为转接号。

**号码策略（重要，勿改）**：页面可见电话 = 转接号；JSON-LD 结构化数据与微信号 = 真实号 647-649-9188（与 Google Business Profile 主号一致，保护本地 SEO 的 NAP 一致性）。在 GBP 后台把转接号加为 **additional phone**。

## 4. 微信二维码

用 Amy 的个人微信二维码图片替换 `images/wechat-qr.jpg`（当前是占位图），建议 ≥400×400。弹窗里已印有"添加时请备注：官网"，Amy 看到备注即知是网站 lead——请提醒 Amy 通过好友时截图存档。

> 以后如升级**企业微信**，可生成带渠道参数的「联系我」活码，扫码人数后台自动统计，归因更准，无需备注暗号。

## 5. Cloudflare Worker（AI 客服后端 + 来电通知，30 分钟）

前置：注册 Cloudflare（免费）；本机装 Node.js；到 https://aistudio.google.com 点 "Get API key" 免费申请 **Gemini API Key**（AI 客服用 gemini-2.5-flash，免费额度每天 1500 次请求，无需绑卡）。

```bash
cd worker
# 先编辑 wrangler.toml：填 WEB3FORMS_KEY
npx wrangler login
npx wrangler secret put GEMINI_API_KEY   # 粘贴 API key
npx wrangler deploy                       # 记下输出的 https://amy-leads.xxx.workers.dev
```

把 Worker 地址填到 `assets/js/lead.js` → `workerUrl: "https://amy-leads.xxx.workers.dev"`。填好后网站右下角自动出现「在线咨询」气泡。

本地调试：`npx wrangler dev`，然后把 `workerUrl` 临时指向 `http://localhost:8787`。

测试留资流程：打开聊天 → 问"墓地多少钱" → 回复中留一个手机号 → 应收到主题为「【官网AI客服】新 Lead！」的邮件，内含完整对话。

## 6. 部署网站

把整个 `site/` 目录内容 push 到 GitHub 仓库 `t9gu/amytorontofuneral-site`（GitHub Pages 已绑定 amytorontofuneral.ca）。`worker/` 与 `docs/` 目录随仓库存放不影响网站。

## 7. 站外 SEO 清单（上线后一周内完成）

1. **Google Business Profile**（本地 SEO 权重最大的单项）：以**服务区域型业务（Service Area Business, SAB）**方式为 Amy 的个人品牌建档——**不要使用墓园地址**（本站是 Amy 的个人推广网站，占用雇主墓园地址会引起投诉）。
   - 名称：Amy 的个人品牌名（如 "Amy Toronto 华人墓地殡仪顾问"），**不要出现墓园 / Arbor 字样**，避免被判定为重复档案。
   - 类别：Funeral service / Cremation service / Consultant 相关。
   - 地址：录入 Amy 的家庭住址仅供 Google 验证，勾选**不向公众显示地址**；设置服务区域 Toronto、Markham、Richmond Hill、Scarborough、North York 等。
   - 电话：主电话填真实号 647-649-9188，转接号加为 additional phone。
   - 验证：Google 可能要求视频验证（准备名片、执照等业务证明）。
   - 运营：上传照片、每周发一条动态、请老客户留评价（评价挂在 Amy 个人品牌档案下，与墓园无关）。
   - 网站 JSON-LD 已配套采用 `ProfessionalService` + `areaServed`（无街道地址），NAP 一致性 = 品牌名 + 电话 + 服务区域。
2. **Google Search Console**：验证 amytorontofuneral.ca，提交 `sitemap.xml`。
3. **Bing Webmaster Tools**：同样验证并提交 sitemap（Bing 索引会喂给 ChatGPT 搜索，是 GEO 的重要入口）。
4. （可选）domain DNS 若迁到 Cloudflare，可用免费 Email Routing 建 `amy@amytorontofuneral.ca` 别名转发 → 发到该地址的邮件 100% 是网站 lead。
5. （后续内容迭代）为四大墓园各建一个独立详情页，承接"高山纪念墓园""好景墓园 价格"等长尾搜索。

## 8. 配置项汇总（快查表）

| 配置项 | 文件 | 说明 |
|---|---|---|
| `ga4Id` | assets/js/lead.js | GA4 衡量 ID |
| `trackingNumber` / `trackingNumberDisplay` | assets/js/lead.js | Twilio 转接号 |
| `workerUrl` | assets/js/lead.js | Worker 地址（AI 客服开关） |
| `web3formsKey` | assets/js/lead.js | 表单投递 |
| `WEB3FORMS_KEY` | worker/wrangler.toml | Worker 邮件通知 |
| `GEMINI_API_KEY` | wrangler secret | Gemini API 密钥（勿写进代码） |
| 微信二维码 | images/wechat-qr.jpg | 替换占位图 |

所有配置留空时网站照常运行：表单降级为打开邮件客户端，AI 客服气泡不显示，电话显示真实号。可以逐项开通、逐项验收。
