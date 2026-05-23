# Internationalization TODO

更新日期：`2026-05-22`

这份 TODO 是 AI Agent Best Practices 的语言系统实施计划。目标不是临时把中文文案翻译成英文，而是建立长期可维护的双语架构，支撑后续更多页面、更多内容对象、公开分享、SEO、缓存和 Agent 调用。

## Decision

采用：

```text
next-intl
+ localePrefix: as-needed
+ 中文默认无前缀
+ 英文使用 /en 前缀
+ AIAGENT_LOCALE cookie 记住手动选择
+ Accept-Language 首次自动判断
+ UI 文案放 messages
+ 内容翻译放数据库 RecordTranslation
```

不采用：

```text
localePrefix: never
同一个 URL 依赖 cookie 渲染不同语言
中文也强制使用 /zh 前缀
把知识内容塞进 messages
一开始就翻译动态 slug
```

## Route Contract

长期公开路由采用中文默认无前缀、英文显式前缀：

```text
/
/en
/records/[slug]
/en/records/[slug]
/resources/github
/en/resources/github
/resources/github/[cardKey]
/en/resources/github/[cardKey]
/roadmap
/en/roadmap
/roadmap/i18n
/en/roadmap/i18n
/models/capability
/en/models/capability
```

API 和静态归档不进入语言路由：

```text
/api/*
/artifacts/*
```

## Language Resolution

语言判断优先级：

```text
1. URL locale: /en 明确使用英文；无前缀默认中文
2. AIAGENT_LOCALE cookie
3. Accept-Language
4. defaultLocale: zh
```

用户手动切换语言时必须：

```text
保留当前 pathname
保留 query string
保留 hash
写入 AIAGENT_LOCALE cookie
跳转到目标 locale 对应路径
```

## Content Boundary

UI 文案：

```text
messages/zh.json
messages/en.json
```

内容数据：

```text
KnowledgeRecord.language
RecordTranslation
Category.name / Category.nameZh
VocabularyTerm.label / VocabularyTerm.labelZh
Tag.name / Tag.nameZh
```

内容选择规则：

```text
如果当前 locale 等于 KnowledgeRecord.language，用主记录字段。
如果当前 locale 不等于 KnowledgeRecord.language，优先找 RecordTranslation。
如果没有对应翻译，fallback 到主记录字段，并显示缺少完整翻译提示。
```

## TODO

### P0 - Infrastructure

- [x] 安装 `next-intl`
- [x] 新增 `messages/zh.json`
- [x] 新增 `messages/en.json`
- [x] 新增 `src/i18n/routing.ts`
- [x] 新增 `src/i18n/request.ts`
- [x] 新增 `src/i18n/navigation.ts`
- [x] 新增 `src/i18n/locale.ts`
- [x] 新增 `src/proxy.ts`
- [x] 包装 `next.config.ts` 的 `next-intl/plugin`
- [x] 将页面迁移到 `src/app/[locale]`
- [x] 新增 `src/app/[locale]/layout.tsx`
- [x] 在 `[locale]/layout.tsx` 设置 `<html lang={locale}>`
- [x] 设置 `AIAGENT_LOCALE` cookie
- [x] 确认 `/` 保持中文默认入口
- [x] 确认英文入口为 `/en`
- [x] 确认带英文偏好的首次访问可以进入 `/en`

### P1 - Navigation And Switcher

- [x] 新增 `src/components/language-switcher.tsx`
- [x] 在 `[locale]/layout.tsx` 全局展示语言切换入口
- [x] 当前语言高亮
- [x] 切换语言时保留 pathname
- [x] 切换语言时保留 query string
- [x] 切换语言时保留 hash
- [x] 项目内所有页面链接改用 `@/i18n/navigation`
- [x] 所有 form action 不再写死 `/`
- [x] 增加旧路由到 locale 路由的重定向策略

### P2 - UI Message Migration

- [x] 迁移首页和搜索页文案
- [x] 迁移记录详情页文案
- [x] 迁移 GitHub 资源列表页文案
- [x] 迁移 GitHub 资源详情页文案
- [x] 迁移 Roadmap 页面文案
- [x] 迁移模型能力矩阵页面文案
- [x] 迁移 loading / empty / error 状态文案
- [x] 新增本地化 404 页面
- [x] 迁移 metadata title 和 description
- [x] 枚举状态文案统一放入 messages
- [x] 字段标签字典统一放入 messages

### P3 - Localized Data Rendering

- [x] 新增 `pickLocalizedRecord(record, locale)`
- [x] 新增 `pickLocalizedName(category/tag, locale)`
- [x] 新增 `pickLocalizedLabel(vocabularyTerm, locale)`
- [x] 记录详情页默认只展示当前语言版本
- [x] 没有翻译时展示 fallback 提示
- [x] 保留“查看其他语言版本”的扩展入口
- [x] JSON metadata 字段标签支持双语
- [x] 日期格式根据 locale 渲染
- [x] 数字格式根据 locale 渲染

### P4 - Search And Content Index

- [x] `searchRecords` 接收 `locale`
- [x] 查询优先当前 locale 的 `RecordSearchIndex`
- [x] fallback 到记录原语言 index
- [x] 中文界面允许召回英文内容
- [x] 英文界面允许召回中文内容
- [x] 搜索结果显示命中语言
- [x] 搜索结果显示是否 fallback
- [x] 建立双语搜索 bad case 清单
- [x] 为中英混合查询补充测试数据

### P5 - Quality Gate

- [x] 增加 `pnpm i18n:check`
- [x] 校验 `messages/zh.json` 与 `messages/en.json` key 完整性
- [x] CI 跑 i18n check
- [x] 增加 locale routing 测试
- [x] 增加 language switcher 测试
- [x] 增加 localized metadata 测试
- [x] 增加无翻译 fallback 测试
- [x] 文档记录新增页面 i18n checklist

## New Page Checklist

后续每新增一个前端页面，必须检查：

```text
页面是否放在 src/app/[locale]
metadata 是否使用 getTranslations
UI 文案是否进入 messages
链接是否使用 @/i18n/navigation
日期和数字是否使用 locale formatter
数据内容是否通过 localized picker
是否有 zh/en 两套文案
是否通过 i18n check
```

## Acceptance Criteria

第一版语言系统完成时必须满足：

```text
/ 是中文默认入口
/en 是英文入口
主要页面都有中文默认路径和 /en 英文路径
语言切换器在所有页面可见
切换语言保留当前页面和 query
刷新后语言选择仍然生效
首页、搜索页、详情页、Roadmap、模型矩阵没有硬编码核心 UI 文案
无翻译内容能 fallback 且有明确提示
lint 和 build 通过
i18n check 和 i18n quality gate 通过
```
