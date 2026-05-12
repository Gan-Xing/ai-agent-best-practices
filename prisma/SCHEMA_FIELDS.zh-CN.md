# 知识库 Schema 字段对照表

这份文档用于逐行核对 `prisma/schema.prisma`。当前 schema 的目标是支撑一个可长期演化的 AI 知识库：结构化录入、全文检索、语义检索、AI 引用回答、版本追踪和后台任务。

## 设计原则

| 原则 | 决策 |
|---|---|
| 核心可搜索字段 | 使用普通数据库列，不只放在 JSON 里。 |
| 主分类体系 | 使用 `Category` 表和稳定编号，比如 `01`，不再用自由 `String`。 |
| 数据库 enum | 只用于生命周期和安全边界：`visibility`、`status`、`maturity`、`freshness`、任务状态。 |
| 受控字典码 | `type`、切块类型、来源类型、关系类型、查询模式等用 `String` + `VocabularyTerm` 管理，避免新增值就做 migration。 |
| 灵活元数据 | 使用 `Json` 保存经常演化的扩展信息。 |
| 长文本和 AI 检索 | 使用 `RecordChunk` 单独保存文本切块。 |
| 多语言 | 主表只放主语言内容，其他语言放 `RecordTranslation`，避免后续每加一种语言就改表。 |
| 向量搜索 | embedding 只挂在 `RecordChunk` 上，不同时维护 record 级和 chunk 级两套路径。 |
| 全文索引 / 向量索引 | `RecordSearchIndex` 和 `RecordEmbedding` 保存结构，GIN/pgvector 索引用 raw SQL migration 添加。 |
| 用户系统 | 当前不急着加入，只预留 `actorId`、`createdBy`、`userId` 等钩子。 |

## 跨字段约束

这些规则 Prisma 不一定能干净表达，应该由 Zod、导入代码、服务层或 raw SQL check 负责。

| 规则 | 执行位置 |
|---|---|
| `confidence` 必须在 `0..1`。 | Zod 校验。 |
| 受控 `String` 字段必须存在于 `VocabularyTerm`。 | Zod 或服务层根据 seed 词表校验。 |
| `KnowledgeRecord.categoryCode` 必须使用启用中的 `Category.code`。 | 数据库关系 + 服务层检查 `isActive`。 |
| `SearchResultLog.chunkId` 有值时，必须属于同一个 `recordId`。 | 服务层校验或 raw SQL check。 |
| `SearchFeedback` 至少应该关联一个目标：query、answer、record 或 chunk。 | Zod 校验。 |
| `RecordEmbedding.dimensions` 必须匹配对应供应商/模型的 embedding 长度。 | embedding worker 校验。 |
| `RecordEmbedding.contentHash` 必须匹配被 embedding 的切块文本哈希。 | embedding worker 校验。 |
| `RecordSearchIndex.contentHash` 必须匹配被索引的记录/切块聚合内容。 | 搜索索引重建 worker 校验。 |
| `payload`、`rawPayload`、`before`、`after`、`snapshot` 里的原始文本应限制大小。 | 导入/审计保留策略。 |

## 模型总览

| 模型 | 作用 |
|---|---|
| `KnowledgeRecord` | 主知识对象。一条记录就是一个知识单元。 |
| `VocabularyTerm` | 可扩展受控字典，用于记录类型、来源类型、关系类型等。 |
| `Category` | 受控的 15 个一级知识分类。 |
| `RecordTranslation` | 知识记录的多语言翻译。 |
| `RecordChunk` | 文本切块，用于长正文检索、embedding 和 AI 上下文组装。 |
| `RecordSearchIndex` | 可重建的全文搜索索引文档。 |
| `Tag` | 标签字典，支持层级。 |
| `KnowledgeRecordTag` | 知识记录和标签的多对多关系。 |
| `Alias` | 别名、缩写、同义词、常见误写。 |
| `Keyword` | 显式关键词，可带权重。 |
| `Source` | 外部或内部来源信息。 |
| `KnowledgeRecordSource` | 知识记录和来源的关系。 |
| `RecordRelation` | 两条知识之间的有方向关系。 |
| `RecordVersion` | 历史版本、快照和差异。 |
| `RecordEmbedding` | 切块级向量 embedding。 |
| `ImportJob` | 导入任务记录。 |
| `ImportJobItem` | 导入任务的单条明细。 |
| `SearchIndexJob` | 全文搜索索引重建任务。 |
| `EmbeddingJob` | 异步 embedding 任务记录。 |
| `AuditLog` | 系统或用户操作审计。 |
| `SearchQueryLog` | 搜索和 AI 查询日志。 |
| `AnswerLog` | AI 回答日志。 |
| `SearchResultLog` | 单次查询的结构化结果和排序分数。 |
| `SearchFeedback` | 搜索或 AI 回答反馈，用于后续调优。 |

## KnowledgeRecord

主表。你的 skill 生成的知识对象最终主要会映射到这里。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 内部稳定 ID。 | Prisma 用 `cuid()` 自动生成。 |
| `slug` | `String` | 是 | 人可读的唯一 URL/key。 | 用于 `/records/[slug]`。 |
| `externalKey` | `String?` | 否 | 全局唯一外部 key。 | 建议由来源命名空间和外部 ID 组合，比如 `openrouter:model:gpt-oss-120b`。 |
| `externalId` | `String?` | 否 | 外部系统原始 ID。 | 不全局唯一，只用于追踪来源 ID。 |
| `checksum` | `String?` | 否 | 内容指纹。 | 用于去重和变化检测。 |
| `schemaVersion` | `Int` | 是 | 知识对象结构版本。 | 默认 `1`；用于未来导入兼容和迁移。 |
| `type` | `String` | 是 | 知识形态或记录类型。 | 受 `VocabularyTerm(namespace=record_type)` 管理；例：`CONCEPT`、`TOOL`、`CASE_STUDY`、`DECISION`。 |
| `categoryCode` | `String` | 是 | 稳定主分类编号。 | 关联 `Category.code`；例：`01`、`07`、`15`。 |
| `visibility` | `RecordVisibility` | 是 | 可见性。 | 默认 `INTERNAL`；例：`PUBLIC`、`INTERNAL`、`PRIVATE`。 |
| `status` | `RecordStatus` | 是 | 发布或工作流状态。 | 默认 `DRAFT`；例：`DRAFT`、`REVIEW`、`PUBLISHED`、`ARCHIVED`。 |
| `maturity` | `RecordMaturity` | 是 | 记录成熟度或可靠程度。 | 默认 `SEED`；例：`SEED`、`REVIEWED`、`VALIDATED`。 |
| `freshness` | `RecordFreshness` | 是 | 新鲜度状态。 | 默认 `UNKNOWN`；例：`FRESH`、`STALE`、`NEEDS_REVIEW`。 |
| `confidence` | `Float?` | 否 | 置信度分数。 | 建议范围 `0..1`，由 Zod 校验。 |
| `language` | `String` | 是 | 主语言。 | 默认 `zh`；可为 `zh`、`en`、`fr` 等。 |
| `title` | `String` | 是 | 主标题。 | 搜索和展示必需。 |
| `summary` | `String?` | 否 | 主摘要。 | 对列表展示和 AI 上下文很重要。 |
| `body` | `String?` | 否 | 主正文。 | 控制长度；很长的正文应切块。 |
| `problem` | `String?` | 否 | 这条知识解决的问题。 | 有利于问答匹配。 |
| `recommendation` | `String?` | 否 | 推荐做法或结论。 | 有利于 AI 生成答案。 |
| `metadata` | `Json?` | 否 | 通用扩展元数据。 | 建了 GIN 索引；核心筛选字段不要只放这里。 |
| `applicability` | `Json?` | 否 | 适用条件。 | 例：环境、规模、约束。 |
| `compatibility` | `Json?` | 否 | 兼容性矩阵。 | 例：模型、供应商、框架支持情况。 |
| `tradeoffs` | `Json?` | 否 | 权衡、优缺点和替代方案。 | 适合决策类知识。 |
| `evidence` | `Json?` | 否 | 证据摘要。 | 详细来源应放到 `Source`。 |
| `metrics` | `Json?` | 否 | 量化指标。 | 例：延迟、成本、benchmark 结果。 |
| `curation` | `Json?` | 否 | 审核和维护元数据。 | 例：审核人备注、质量检查表。 |
| `extensions` | `Json?` | 否 | 未来扩展字段。 | 最后兜底用，避免频繁改表。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 数据库默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护 `@updatedAt`。 |
| `publishedAt` | `DateTime?` | 否 | 首次发布时间。 | 当状态变成 published 时设置。 |
| `lastVerifiedAt` | `DateTime?` | 否 | 最近一次人工或自动验证时间。 | 用于识别过期知识。 |
| `reviewAfter` | `DateTime?` | 否 | 下一次需要复查的时间。 | 用于维护队列。 |
| `archivedAt` | `DateTime?` | 否 | 归档时间。 | 建议软归档，不直接删除。 |
| `tags` | relation | 否 | 关联标签。 | 通过 `KnowledgeRecordTag`。 |
| `category` | relation | 是 | 主分类。 | 通过 `categoryCode` 关联 `Category`。 |
| `translations` | relation | 否 | 多语言翻译。 | 通过 `RecordTranslation`。 |
| `aliases` | relation | 否 | 别名。 | 通过 `Alias`。 |
| `keywords` | relation | 否 | 搜索关键词。 | 通过 `Keyword`。 |
| `sources` | relation | 否 | 证据和来源。 | 通过 `KnowledgeRecordSource`。 |
| `versions` | relation | 否 | 版本历史。 | 通过 `RecordVersion`。 |
| `chunks` | relation | 否 | 文本切块。 | 通过 `RecordChunk`。 |
| `searchIndexes` | relation | 否 | 全文索引文档。 | 通过 `RecordSearchIndex`。 |
| `searchIndexJobs` | relation | 否 | 搜索索引重建任务。 | 通过 `SearchIndexJob`。 |
| `embeddingJobs` | relation | 否 | 关联的 embedding 任务。 | 通过 `EmbeddingJob`。 |
| `importItems` | relation | 否 | 导入明细。 | 通过 `ImportJobItem`。 |
| `searchResults` | relation | 否 | 查询结果日志。 | 通过 `SearchResultLog`。 |
| `feedback` | relation | 否 | 搜索反馈。 | 通过 `SearchFeedback`。 |
| `outgoingRelations` | relation | 否 | 从这条记录指向其他记录的关系。 | 例：依赖、替代。 |
| `incomingRelations` | relation | 否 | 其他记录指向这条记录的关系。 | 反向查询用。 |

## Category

受控一级分类。你原来的 15 个方向应该作为 seed 数据进入这张表。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 内部分类 ID。 | Prisma 用 `cuid()` 自动生成。 |
| `code` | `String` | 是 | 稳定分类编号。 | 例：`01`、`02`、`15`；由 `KnowledgeRecord.categoryCode` 引用。 |
| `slug` | `String` | 是 | 唯一 URL 或导入 key。 | 例：`models`、`instruction`、`runtime`。 |
| `name` | `String` | 是 | 英文展示名。 | 例：`Models`。 |
| `nameZh` | `String?` | 否 | 中文展示名。 | 可选。 |
| `description` | `String?` | 否 | 分类描述。 | 使用你给出的那句分类说明。 |
| `parentCode` | `String?` | 否 | 父分类编号。 | 预留未来层级分类。 |
| `sortOrder` | `Int` | 是 | 展示排序。 | 默认 `100`；可用 `1..15`。 |
| `isActive` | `Boolean` | 是 | 是否启用。 | 分类废弃时建议禁用，不直接删除。 |
| `metadata` | `Json?` | 否 | 分类扩展元数据。 | 例：图标、颜色、旧别名。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `parent` | relation | 否 | 父分类。 | 自关联。 |
| `children` | relation | 否 | 子分类。 | 自关联。 |
| `records` | relation | 否 | 该分类下的知识记录。 | 通过 `KnowledgeRecord.categoryCode`。 |

## VocabularyTerm

可扩展受控字典。它解决的是“既要受控，又不想每次新增值都改 Prisma enum”的问题。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 字典项 ID。 | 自动生成。 |
| `namespace` | `String` | 是 | 字典命名空间。 | 例：`record_type`、`source_type`、`record_relation_type`。 |
| `code` | `String` | 是 | 稳定机器码。 | 例：`NOTE`、`URL`、`DEPENDS_ON`。 |
| `label` | `String` | 是 | 英文展示名。 | UI 可用。 |
| `labelZh` | `String?` | 否 | 中文展示名。 | 中文 UI 可用。 |
| `description` | `String?` | 否 | 字典项说明。 | 可选。 |
| `sortOrder` | `Int` | 是 | 展示排序。 | 默认 `100`。 |
| `isActive` | `Boolean` | 是 | 是否启用。 | 废弃时禁用，不删除。 |
| `metadata` | `Json?` | 否 | 扩展元数据。 | 例：颜色、图标、旧别名。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |

## RecordTranslation

多语言翻译表。避免在主表里固定 `titleZh/titleEn` 这类字段。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 翻译 ID。 | 自动生成。 |
| `recordId` | `String` | 是 | 所属知识记录 ID。 | 删除记录时级联删除。 |
| `language` | `String` | 是 | 翻译语言。 | 例：`zh`、`en`、`fr`。 |
| `title` | `String` | 是 | 翻译标题。 | 每种语言一个标题。 |
| `summary` | `String?` | 否 | 翻译摘要。 | 可选。 |
| `body` | `String?` | 否 | 翻译正文。 | 可选。 |
| `problem` | `String?` | 否 | 翻译后的问题描述。 | 可选。 |
| `recommendation` | `String?` | 否 | 翻译后的建议。 | 可选。 |
| `metadata` | `Json?` | 否 | 翻译扩展元数据。 | 例：翻译来源、审核状态。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `record` | relation | 是 | 所属记录。 | `KnowledgeRecord`。 |

## RecordChunk

当正文较长，或者 AI 检索需要更小上下文单元时使用。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 切块 ID。 | 自动生成。 |
| `recordId` | `String` | 是 | 所属知识记录 ID。 | 删除记录时级联删除。 |
| `chunkNo` | `Int` | 是 | 切块序号。 | 在同一条记录内保持稳定顺序。 |
| `kind` | `String` | 是 | 切块类型。 | 受 `VocabularyTerm(namespace=chunk_kind)` 管理；默认 `BODY`。 |
| `language` | `String` | 是 | 切块语言。 | 默认 `zh`。 |
| `text` | `String` | 是 | 切块文本。 | FTS 和 embedding 的主要输入。 |
| `contentHash` | `String` | 是 | 切块内容哈希。 | 用于判断 embedding 是否过期。 |
| `tokenCount` | `Int?` | 否 | 估算 token 数。 | 用于 AI 上下文预算。 |
| `metadata` | `Json?` | 否 | 切块元数据。 | 例：标题层级、原文位置。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `record` | relation | 是 | 所属记录。 | `KnowledgeRecord`。 |
| `embeddings` | relation | 否 | 切块 embedding。 | 推荐的 embedding 目标。 |
| `embeddingJobs` | relation | 否 | 等待或历史 embedding 任务。 | 通过 `EmbeddingJob`。 |
| `searchResults` | relation | 否 | 命中该切块的搜索结果日志。 | 通过 `SearchResultLog`。 |
| `feedback` | relation | 否 | 针对该切块的反馈。 | 通过 `SearchFeedback`。 |

## RecordSearchIndex

可重建的搜索索引文档。它把标题、摘要、正文、标签、别名和关键词聚合成一份适合 FTS 的材料，避免每次搜索都实时 join 多张表。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 搜索索引 ID。 | 自动生成。 |
| `recordId` | `String` | 是 | 所属知识记录 ID。 | 每条记录每种语言一份索引。 |
| `language` | `String` | 是 | 索引语言。 | 默认 `zh`。 |
| `title` | `String` | 是 | 标题索引文本。 | 高权重 FTS 字段。 |
| `summary` | `String?` | 否 | 摘要索引文本。 | 中高权重。 |
| `body` | `String?` | 否 | 正文索引文本。 | 通常来自 chunks 聚合。 |
| `tags` | `String?` | 否 | 标签聚合文本。 | 用于标签命中和召回。 |
| `aliases` | `String?` | 否 | 别名聚合文本。 | 用于同义词和缩写召回。 |
| `keywords` | `String?` | 否 | 关键词聚合文本。 | 用于显式搜索增强。 |
| `contentHash` | `String` | 是 | 索引内容哈希。 | 用于判断索引是否需要重建。 |
| `searchVector` | `Unsupported("tsvector")?` | 否 | Postgres FTS 向量。 | 用 raw SQL 维护和查询。 |
| `metadata` | `Json?` | 否 | 索引元数据。 | 例：索引器版本、分词配置。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `record` | relation | 是 | 所属记录。 | 删除记录时级联删除。 |

## Tag

受控标签字典。不要只把所有标签作为原始数组塞进主表。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 标签 ID。 | 自动生成。 |
| `slug` | `String` | 是 | 唯一标签 key。 | 例：`tool-calling`。 |
| `name` | `String` | 是 | 展示名称。 | 主标签名。 |
| `nameZh` | `String?` | 否 | 中文展示名。 | 可选。 |
| `description` | `String?` | 否 | 标签说明。 | 后台管理有用。 |
| `parentId` | `String?` | 否 | 父标签 ID。 | 支持标签层级。 |
| `metadata` | `Json?` | 否 | 标签扩展元数据。 | 例：颜色、排序。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `parent` | relation | 否 | 父标签。 | 自关联。 |
| `children` | relation | 否 | 子标签。 | 自关联。 |
| `records` | relation | 否 | 关联记录。 | 通过中间表。 |

## KnowledgeRecordTag

知识记录和标签之间的中间表。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `recordId` | `String` | 是 | 记录 ID。 | 复合主键的一部分。 |
| `tagId` | `String` | 是 | 标签 ID。 | 复合主键的一部分。 |
| `weight` | `Float?` | 否 | 该标签对这条记录的重要性。 | 默认 `1`。 |
| `createdAt` | `DateTime` | 是 | 关联创建时间。 | 默认 `now()`。 |
| `record` | relation | 是 | 关联记录。 | 删除时级联。 |
| `tag` | relation | 是 | 关联标签。 | 删除时级联。 |

## Alias

别名、缩写、翻译名或常见误写。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 别名 ID。 | 自动生成。 |
| `recordId` | `String` | 是 | 所属记录 ID。 | 删除时级联。 |
| `alias` | `String` | 是 | 别名文本。 | 已建立索引。 |
| `language` | `String` | 是 | 别名语言。 | 默认 `zh`。 |
| `kind` | `String` | 是 | 别名类型。 | 受 `VocabularyTerm(namespace=alias_kind)` 管理；例：`ALIAS`、`ACRONYM`。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `record` | relation | 是 | 所属记录。 | `KnowledgeRecord`。 |

## Keyword

显式搜索关键词，可带权重。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 关键词 ID。 | 自动生成。 |
| `recordId` | `String` | 是 | 所属记录 ID。 | 删除时级联。 |
| `keyword` | `String` | 是 | 关键词文本。 | 已建立索引。 |
| `language` | `String` | 是 | 关键词语言。 | 默认 `zh`。 |
| `weight` | `Float?` | 否 | 搜索排序权重。 | 默认 `1`。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `record` | relation | 是 | 所属记录。 | `KnowledgeRecord`。 |

## Source

来源信息。AI 回答引用依据时会用到。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 来源 ID。 | 自动生成。 |
| `sourceKey` | `String?` | 否 | 全局唯一来源 key。 | 建议用规范化 URI、文件路径或外部来源 ID 生成。 |
| `sourceType` | `String` | 是 | 来源类型。 | 受 `VocabularyTerm(namespace=source_type)` 管理；例：`URL`、`PAPER`、`REPOSITORY`。 |
| `uri` | `String?` | 否 | URL、路径或外部 URI。 | 已建立索引。 |
| `title` | `String?` | 否 | 来源标题。 | 用于展示和引用。 |
| `author` | `String?` | 否 | 来源作者。 | 可选引用元数据。 |
| `publisher` | `String?` | 否 | 发布方或平台。 | 例：GitHub、OpenAI Docs。 |
| `publishedAt` | `DateTime?` | 否 | 来源发布时间。 | 新鲜度判断很重要。 |
| `accessedAt` | `DateTime?` | 否 | 查看或抓取来源的时间。 | 对网页来源有用。 |
| `checksum` | `String?` | 否 | 来源内容哈希。 | 用于去重和变化检测。 |
| `rawPayload` | `Json?` | 否 | 原始来源元数据。 | 不建议存超大原文。 |
| `metadata` | `Json?` | 否 | 扩展元数据。 | 供应商或来源特定信息。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `records` | relation | 否 | 关联记录。 | 通过 `KnowledgeRecordSource`。 |

## KnowledgeRecordSource

知识记录和来源之间的中间表。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `recordId` | `String` | 是 | 记录 ID。 | 复合主键的一部分。 |
| `sourceId` | `String` | 是 | 来源 ID。 | 复合主键的一部分。 |
| `role` | `String` | 是 | 来源角色。 | 受 `VocabularyTerm(namespace=source_role)` 管理；默认 `REFERENCE`。 |
| `quote` | `String?` | 否 | 简短支持性引用。 | 摘录应保持简短。 |
| `note` | `String?` | 否 | 关于来源用途的内部备注。 | 可选。 |
| `metadata` | `Json?` | 否 | 关系元数据。 | 例：置信度、页码。 |
| `createdAt` | `DateTime` | 是 | 关联创建时间。 | 默认 `now()`。 |
| `record` | relation | 是 | 关联记录。 | 删除时级联。 |
| `source` | relation | 是 | 关联来源。 | 删除时级联。 |

## RecordRelation

知识记录之间的有向图关系。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 关系 ID。 | 自动生成。 |
| `fromRecordId` | `String` | 是 | 起点记录 ID。 | 有向边起点。 |
| `toRecordId` | `String` | 是 | 终点记录 ID。 | 有向边终点。 |
| `relationType` | `String` | 是 | 关系类型。 | 受 `VocabularyTerm(namespace=record_relation_type)` 管理。 |
| `strength` | `Float?` | 否 | 关系强度。 | 默认 `1`。 |
| `description` | `String?` | 否 | 人类可读说明。 | 可选。 |
| `metadata` | `Json?` | 否 | 关系扩展元数据。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `fromRecord` | relation | 是 | 起点记录。 | 删除时级联。 |
| `toRecord` | relation | 是 | 终点记录。 | 删除时级联。 |

## RecordVersion

版本历史表。应由导入或编辑流程自动写入，不建议手工写。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 版本 ID。 | 自动生成。 |
| `recordId` | `String` | 是 | 所属记录 ID。 | 删除时级联。 |
| `versionNo` | `Int` | 是 | 顺序版本号。 | 同一条记录内唯一。 |
| `changeType` | `String` | 是 | 变化类型。 | 受 `VocabularyTerm(namespace=record_change_type)` 管理；默认 `UPDATE`。 |
| `title` | `String?` | 否 | 标题快照。 | 便于快速 diff。 |
| `summary` | `String?` | 否 | 摘要快照。 | 便于快速 diff。 |
| `body` | `String?` | 否 | 正文快照。 | 注意存储增长。 |
| `snapshot` | `Json?` | 否 | 完整记录快照。 | 有用，但可能快速变大。 |
| `diff` | `Json?` | 否 | 结构化差异。 | 推荐存紧凑 diff。 |
| `createdBy` | `String?` | 否 | 未来用户或系统 actor ID。 | 用户系统钩子。 |
| `note` | `String?` | 否 | 变更备注。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 版本创建时间。 | 默认 `now()`。 |
| `record` | relation | 是 | 所属记录。 | `KnowledgeRecord`。 |

## RecordEmbedding

向量存储。只支持切块级 embedding。记录级 embedding 也应通过一个 `kind=BODY` 或 `kind=SUMMARY` 的切块表达。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | embedding ID。 | 自动生成。 |
| `chunkId` | `String` | 是 | 所属切块 ID。 | embedding 的唯一目标。 |
| `provider` | `String` | 是 | embedding 供应商。 | 例：`openai`、`openrouter`、`local`。 |
| `model` | `String` | 是 | embedding 模型。 | 例：`text-embedding-3-small`。 |
| `dimensions` | `Int` | 是 | 向量维度。 | 必须和模型一致。 |
| `contentHash` | `String` | 是 | 被 embedding 文本的哈希。 | 防止重复生成 embedding。 |
| `embedding` | `Unsupported("vector")?` | 否 | pgvector 字段。 | 用 raw SQL 查询，不走普通 Prisma client 查询。 |
| `metadata` | `Json?` | 否 | 供应商和模型元数据。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `chunk` | relation | 是 | 所属切块。 | 删除切块时级联删除。 |

## ImportJob

记录导入批次。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 任务 ID。 | 自动生成。 |
| `sourceType` | `String` | 是 | 导入来源类型。 | 受 `VocabularyTerm(namespace=import_source_type)` 管理。 |
| `status` | `JobStatus` | 是 | 任务状态。 | 默认 `QUEUED`；例：`QUEUED`、`RUNNING`、`DONE`、`FAILED`。 |
| `payload` | `Json?` | 否 | 导入请求参数。 | 尽量避免超大 payload。 |
| `stats` | `Json?` | 否 | 导入结果统计。 | 例：created、updated、skipped。 |
| `error` | `String?` | 否 | 错误信息。 | 存短错误，不存巨大日志。 |
| `startedAt` | `DateTime?` | 否 | 开始时间。 | 可选。 |
| `finishedAt` | `DateTime?` | 否 | 完成时间。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `items` | relation | 否 | 导入明细列表。 | 通过 `ImportJobItem`。 |

## ImportJobItem

导入任务的单条明细。批量导入几千条时，失败、跳过、更新都应该能定位到具体对象。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 明细 ID。 | 自动生成。 |
| `jobId` | `String` | 是 | 所属导入任务 ID。 | 删除导入任务时级联删除。 |
| `recordId` | `String?` | 否 | 写入后的知识记录 ID。 | 记录删除时设为 `null`。 |
| `externalKey` | `String?` | 否 | 稳定外部 key。 | 有值时应和 `KnowledgeRecord.externalKey` 一致。 |
| `externalId` | `String?` | 否 | 外部 ID。 | 便于定位导入源。 |
| `slug` | `String?` | 否 | 目标 slug。 | 便于定位记录。 |
| `action` | `String?` | 否 | 导入动作。 | 受 `VocabularyTerm(namespace=import_item_action)` 管理。 |
| `status` | `JobStatus` | 是 | 明细状态。 | 默认 `QUEUED`。 |
| `checksum` | `String?` | 否 | 导入项内容哈希。 | 用于跳过未变化对象。 |
| `payload` | `Json?` | 否 | 原始或规范化后的输入。 | 避免存超大正文。 |
| `error` | `String?` | 否 | 错误信息。 | 存短错误。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `job` | relation | 是 | 所属导入任务。 | `ImportJob`。 |
| `record` | relation | 否 | 写入后的记录。 | `KnowledgeRecord`。 |

## SearchIndexJob

全文搜索索引重建任务。用于导入后、记录变更后、或手动全量重建 `RecordSearchIndex`。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 任务 ID。 | 自动生成。 |
| `recordId` | `String?` | 否 | 目标记录 ID。 | 为空时可表示批量任务。 |
| `language` | `String?` | 否 | 目标语言。 | 可选。 |
| `status` | `JobStatus` | 是 | 任务状态。 | 默认 `QUEUED`。 |
| `attempts` | `Int` | 是 | 重试次数。 | 默认 `0`。 |
| `priority` | `Int` | 是 | 队列优先级。 | 数字越小优先级越高。 |
| `reason` | `String?` | 否 | 重建原因。 | 受 `VocabularyTerm(namespace=search_index_reason)` 管理。 |
| `error` | `String?` | 否 | 错误信息。 | 可选。 |
| `lockedAt` | `DateTime?` | 否 | worker 锁定时间。 | 防重复处理。 |
| `startedAt` | `DateTime?` | 否 | 开始时间。 | 可选。 |
| `finishedAt` | `DateTime?` | 否 | 完成时间。 | 可选。 |
| `payload` | `Json?` | 否 | 额外任务参数。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `record` | relation | 否 | 目标记录。 | 记录删除时设为 `null`。 |

## EmbeddingJob

异步生成 embedding 的任务表。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 任务 ID。 | 自动生成。 |
| `recordId` | `String?` | 否 | 目标记录 ID。 | 批量任务可为空。 |
| `chunkId` | `String?` | 否 | 目标切块 ID。 | embedding 推荐目标。 |
| `provider` | `String` | 是 | embedding 供应商。 | 例：`openrouter`。 |
| `model` | `String` | 是 | embedding 模型。 | 用于可复现。 |
| `status` | `JobStatus` | 是 | 任务状态。 | 默认 `QUEUED`。 |
| `attempts` | `Int` | 是 | 重试次数。 | 默认 `0`。 |
| `priority` | `Int` | 是 | 队列优先级。 | 可以约定数字越小优先级越高。 |
| `error` | `String?` | 否 | 最近一次错误。 | 可选。 |
| `lockedAt` | `DateTime?` | 否 | worker 锁定时间。 | 防止多个 worker 重复处理。 |
| `startedAt` | `DateTime?` | 否 | 开始时间。 | 可选。 |
| `finishedAt` | `DateTime?` | 否 | 完成时间。 | 可选。 |
| `payload` | `Json?` | 否 | 额外任务参数。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `updatedAt` | `DateTime` | 是 | 更新时间。 | Prisma 自动维护。 |
| `record` | relation | 否 | 目标记录。 | 记录删除时设为 `null`，保留任务历史。 |
| `chunk` | relation | 否 | 目标切块。 | 切块删除时设为 `null`，保留任务历史。 |

## AuditLog

记录用户、系统 worker、导入和 AI 操作。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 审计记录 ID。 | 自动生成。 |
| `actorId` | `String?` | 否 | 未来用户、agent 或系统 actor ID。 | 以后可以关联 `User`。 |
| `actorType` | `String` | 是 | actor 类型。 | 受 `VocabularyTerm(namespace=actor_type)` 管理；默认 `SYSTEM`。 |
| `action` | `String` | 是 | 操作名称。 | 例：`record.create`、`record.update`、`embedding.generate`。 |
| `targetType` | `String` | 是 | 目标模型或实体类型。 | 例：`KnowledgeRecord`。 |
| `targetId` | `String?` | 否 | 目标实体 ID。 | 可选。 |
| `before` | `Json?` | 否 | 变更前状态。 | 不要每次都存超大正文。 |
| `after` | `Json?` | 否 | 变更后状态。 | 可选。 |
| `metadata` | `Json?` | 否 | 额外审计元数据。 | 可选。 |
| `ipAddress` | `String?` | 否 | 请求 IP。 | 对后台操作有用。 |
| `userAgent` | `String?` | 否 | 浏览器或客户端 user agent。 | 可选。 |
| `createdAt` | `DateTime` | 是 | 审计时间。 | 默认 `now()`。 |

## SearchQueryLog

记录普通搜索和 AI ask 使用情况。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 查询日志 ID。 | 自动生成。 |
| `query` | `String` | 是 | 用户查询文本。 | 记录前要考虑隐私。 |
| `mode` | `String` | 是 | 查询模式。 | 受 `VocabularyTerm(namespace=search_mode)` 管理；默认 `SEARCH`。 |
| `filters` | `Json?` | 否 | 使用的筛选条件。 | categoryCode、tags、status 等。 |
| `resultCount` | `Int?` | 否 | 返回结果数量。 | 用于分析。 |
| `topRecordIds` | `Json?` | 否 | 排名前列结果 ID。 | 以 JSON 数组保存。 |
| `latencyMs` | `Int?` | 否 | 查询耗时。 | 用于优化。 |
| `userId` | `String?` | 否 | 未来用户 ID。 | 用户系统钩子。 |
| `sessionId` | `String?` | 否 | 匿名或会话 ID。 | 没登录时也有用。 |
| `metadata` | `Json?` | 否 | 查询扩展元数据。 | 例：排序器版本。 |
| `createdAt` | `DateTime` | 是 | 查询时间。 | 默认 `now()`。 |
| `results` | relation | 否 | 本次查询的结构化结果。 | 通过 `SearchResultLog`。 |
| `feedback` | relation | 否 | 本次查询收到的反馈。 | 通过 `SearchFeedback`。 |
| `answers` | relation | 否 | 本次查询生成的 AI 回答。 | 通过 `AnswerLog`。 |

## AnswerLog

AI 回答日志。用于追踪模型、prompt 版本、引用、token、成本和延迟。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 回答日志 ID。 | 自动生成。 |
| `queryLogId` | `String` | 是 | 所属查询日志 ID。 | 删除查询日志时级联删除。 |
| `provider` | `String` | 是 | 模型供应商。 | 例：`openai`、`openrouter`。 |
| `model` | `String` | 是 | 生成模型。 | 用于复盘。 |
| `promptVersion` | `String?` | 否 | prompt 版本。 | 便于回归分析。 |
| `answer` | `String` | 是 | 生成回答正文。 | 可按需截断或只存摘要。 |
| `citations` | `Json?` | 否 | 引用记录和片段。 | 建议保存 recordId、chunkId、quote。 |
| `inputTokens` | `Int?` | 否 | 输入 token。 | 成本统计。 |
| `outputTokens` | `Int?` | 否 | 输出 token。 | 成本统计。 |
| `costUsd` | `Float?` | 否 | 估算美元成本。 | 可选。 |
| `latencyMs` | `Int?` | 否 | 生成耗时。 | 性能分析。 |
| `metadata` | `Json?` | 否 | 扩展元数据。 | 例：temperature、工具调用摘要。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `queryLog` | relation | 是 | 所属查询。 | `SearchQueryLog`。 |
| `feedback` | relation | 否 | 针对该回答的反馈。 | 通过 `SearchFeedback`。 |

## SearchResultLog

单次搜索或 AI 查询返回的结构化结果。它既能记录 record 级全文搜索结果，也能记录 chunk 级向量/RAG 结果。相比只存 `topRecordIds` JSON，它能保留排名、分数和来源，后续可以做排序评估。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 结果日志 ID。 | 自动生成。 |
| `queryLogId` | `String` | 是 | 所属查询日志 ID。 | 删除查询日志时级联删除。 |
| `recordId` | `String` | 是 | 命中的知识记录 ID。 | 删除记录时级联删除。 |
| `chunkId` | `String?` | 否 | 命中的切块 ID。 | 可选，因为有些搜索只返回 record 级结果。 |
| `rank` | `Int` | 是 | 最终排序位置。 | 从 1 开始更直观。 |
| `score` | `Float?` | 否 | 最终综合分。 | 可选。 |
| `source` | `String` | 是 | 结果来源。 | 受 `VocabularyTerm(namespace=search_result_source)` 管理；默认 `HYBRID`。 |
| `scores` | `Json?` | 否 | 分项分数。 | 例：FTS、vector、freshness、confidence。 |
| `metadata` | `Json?` | 否 | 扩展元数据。 | 例：ranker 版本。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `queryLog` | relation | 是 | 所属查询。 | `SearchQueryLog`。 |
| `record` | relation | 是 | 命中记录。 | `KnowledgeRecord`。 |
| `chunk` | relation | 否 | 命中切块。 | `RecordChunk`；切块重建或删除后设为 `null`。 |

## SearchFeedback

搜索或 AI 回答反馈。这个表先保留轻量结构，后续可以用于调权重、评估、发现过期知识。

| 字段 | 类型 | 必填 | 作用 | 备注 |
|---|---:|---:|---|---|
| `id` | `String` | 是 | 反馈 ID。 | 自动生成。 |
| `queryLogId` | `String?` | 否 | 对应查询日志。 | 查询日志删除时设为 `null`。 |
| `answerId` | `String?` | 否 | 对应 AI 回答。 | 回答日志删除时设为 `null`。 |
| `recordId` | `String?` | 否 | 对应知识记录。 | 记录删除时设为 `null`。 |
| `chunkId` | `String?` | 否 | 对应切块。 | 用于评价某个具体召回或引用片段。 |
| `userId` | `String?` | 否 | 未来用户 ID。 | 用户系统钩子。 |
| `sessionId` | `String?` | 否 | 匿名会话 ID。 | 无登录时可用。 |
| `rating` | `Int?` | 否 | 数字评分。 | 例如 1 到 5，由 Zod 限制。 |
| `label` | `String?` | 否 | 反馈标签。 | 受 `VocabularyTerm(namespace=feedback_label)` 管理。 |
| `comment` | `String?` | 否 | 文字反馈。 | 可选。 |
| `metadata` | `Json?` | 否 | 扩展元数据。 | 例：界面位置。 |
| `createdAt` | `DateTime` | 是 | 创建时间。 | 默认 `now()`。 |
| `queryLog` | relation | 否 | 对应查询。 | `SearchQueryLog`。 |
| `answer` | relation | 否 | 对应生成回答。 | `AnswerLog`。 |
| `record` | relation | 否 | 对应记录。 | `KnowledgeRecord`。 |
| `chunk` | relation | 否 | 对应切块。 | `RecordChunk`。 |

## 未来用户系统

当前 schema 暂时不直接加入用户表，只预留钩子：

| 当前钩子 | 所在位置 | 未来用途 |
|---|---|---|
| `AuditLog.actorId` | 审计日志 | 关联 `User.id` 或 `ApiKey.id`。 |
| `RecordVersion.createdBy` | 版本历史 | 追踪是谁修改了记录。 |
| `SearchQueryLog.userId` | 查询日志 | 追踪登录用户的搜索和 AI 使用。 |
| `SearchQueryLog.sessionId` | 查询日志 | 追踪匿名使用。 |

当登录、权限或多人编辑真正需要时，再加入这些模型：

| 未来模型 | 作用 | 可能字段 |
|---|---|---|
| `User` | 人类用户账号。 | `id`、`email`、`name`、`role`、`status`、`createdAt`、`updatedAt`、`lastLoginAt`。 |
| `ApiKey` | skill、导入脚本、API 访问。 | `id`、`name`、`keyHash`、`scope`、`status`、`lastUsedAt`、`expiresAt`、`createdBy`。 |
| `Session` | 可选的服务端 session。 | `id`、`userId`、`expiresAt`、`ipAddress`、`userAgent`。 |
| `UserRecordRole` | 单条记录的所有权或审核权限。 | `userId`、`recordId`、`role`。 |
| `SavedSearch` | 用户保存的筛选或搜索。 | `userId`、`name`、`query`、`filters`。 |
| `Feedback` | 搜索或 AI 回答质量反馈。 | `userId`、`queryLogId`、`answerId`、`recordId`、`chunkId`、`rating`、`comment`。 |

建议第一版角色：

| 角色 | 作用 |
|---|---|
| `owner` | 系统完全控制。 |
| `admin` | 管理记录、任务、标签、来源。 |
| `editor` | 创建和编辑知识记录。 |
| `reviewer` | 验证、发布、标记新鲜度。 |
| `reader` | 搜索和查看已发布记录。 |
| `agent` | API 或 skill worker 账号，只允许导入或查询等有限权限。 |

## 优先确认的字段

这些字段最值得在写 Zod 和导入流程前先确认：

| 领域 | 需要确认的决策 |
|---|---|
| `type` | 已改为受控字典码；新增类型只需要更新 seed/Zod，不需要改 Prisma enum。 |
| `categoryCode` | 这 15 个 seed 分类是否就是最终一级分类？ |
| `status` | `DRAFT/REVIEW/PUBLISHED/ARCHIVED` 是否足够？ |
| `maturity` | maturity 表示质量、工程可用度，还是来源可信度？ |
| `freshness` | 新鲜度由人工维护、日期推导，还是来源变化推导？ |
| `confidence` | 使用 0-1 数值，low/medium/high，还是两者都要？ |
| `body` vs `chunks` | 第一版允许主表有 `body`，但搜索和 embedding 统一依赖 `RecordChunk`。 |
| 多语言 | 已采用 `RecordTranslation`，不再固定 `Zh/En` 字段。 |
| 版本历史 | 现在就需要完整快照，还是第一版只要审计日志？ |
| 用户 | 第一版是单用户后台，还是从第一天就多用户？ |
