---
name: complaint-risk-check
description: 检查 amytorontofuneral.ca（Amy 个人推广网站）是否存在引起雇主墓园/Arbor Memorial 投诉的风险。适用于新增页面、修改结构化数据、更新联系信息、建立站外档案（GBP/Bing/目录）之前或之后的例行审查。
---

# 投诉风险检查清单（Amy 个人推广网站）

## 背景

本站是 Amy 的**个人品牌推广网站**，Amy 就职于 Arbor Memorial 旗下墓园（12492 Woodbine Ave, Gormley）。
**红线**：不得把雇主的地址、名称、商标声明为 Amy 自己的营业实体，否则墓园可能投诉。
**安全**：陈述就职关系（worksFor / "Arbor Memorial 持牌墓园总监"）、介绍墓园本身的信息（地址、配套、价格），均属事实陈述，无风险。

## 一、结构化数据（JSON-LD）检查

- [ ] 业务节点 `@type` 必须是 `ProfessionalService`，**不得**用 `Cemetery` / `FuneralHome` / `LocalBusiness`+墓园地址
- [ ] 业务节点**不得**含 `address` / `geo` / `hasMap` 指向墓园地址
- [ ] **不得**用 `parentOrganization` 声明自己是 Arbor 的下属机构；`Person` 节点用 `worksFor` 指向 Arbor（允许）
- [ ] 用 `areaServed`（服务区域）替代街道地址

快速验证命令（在 site/ 目录下运行）：

```bash
# 应只出现在"墓园介绍"内容里（index.html 好景墓园卡片），不得出现在 JSON-LD、页脚、联系区
grep -n "Woodbine" *.html zh-hant/*.html

# JSON-LD 里不得出现 PostalAddress / Cemetery 类型
grep -n '"Cemetery"\|PostalAddress' *.html zh-hant/*.html
```

## 二、页面可见文字检查

- [ ] 页脚 NAP：只写「品牌名 + 电话 + 服务范围：大多伦多地区（GTA）」，**不写墓园地址**
- [ ] 联系区：**不得**出现「办公地址：12492 Woodbine…」字样，用「服务范围 / 可预约墓园现场或上门咨询」表述
- [ ] 墓园介绍卡片/详情页：可以写墓园地址与设施（介绍性内容），但**不得**暗示该墓园地址 = Amy 的营业地点
- [ ] 品牌呈现：网站不得自称墓园/Arbor 官方网站；「Arbor Memorial 持牌墓园总监」头衔表述可保留

## 三、站外档案检查（GBP / Bing Places / 目录）

- [ ] GBP 用 **SAB（服务区域型业务）**方式建档：地址用 Amy 家庭住址仅供验证、**对公众隐藏**，设服务区域
- [ ] 档案名称用个人品牌，**不含**墓园名 / Arbor 字样（避免重复档案判定 + 投诉）
- [ ] 所有目录（Yelp、YellowPages、411.ca、约克论坛、51.ca 等）的 NAP 统一为：品牌名 + 647-649-9188 + 服务区域，**无墓园地址**
- [ ] 不上传墓园官方 logo / 商标图片；照片用 Amy 自己拍摄或有授权的素材

## 四、观察项（非红线，留意即可）

- [ ] 网站使用工作邮箱 `ahuang@arbormemorial.com` 接收个人推广咨询——存在雇主邮箱政策风险，如日后有条件建议改用 `amy@amytorontofuneral.ca`（Cloudflare Email Routing 免费别名）
- [ ] 新增墓园详情页上线前，按本清单第二节复查一遍
- [ ] 若 Amy 更换雇主或墓园，全站 worksFor / 头衔 / 墓园介绍需同步更新

## 五、历史基线（2026-07-05 已完成的整改）

- `index.html` / `zh-hant/index.html` JSON-LD：`["LocalBusiness","Cemetery"]` → `ProfessionalService`，已删 `address`/`geo`/`hasMap`/`parentOrganization`
- 首页联系区「办公地址」→「服务范围」（简/繁）
- 全站 12 个页面页脚墓园地址 → 「服务范围：大多伦多地区（GTA）」
- `docs/lead-tracking-setup.md` 第 7 节 GBP 指引改为 SAB 方案
