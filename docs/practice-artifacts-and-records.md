# Practice, Artifacts, and Records

这份文档用来固定这个仓库里“实践代码、运行结果、最终页面、知识记录”的分层规则，避免后面把工作区输出和正式内容混在一起。

## 为什么 `runtime/` 被忽略

`runtime/` 被 `.gitignore` 忽略，不是因为它不重要，而是因为它承担的是：

- 测试输出
- 日志
- 中间 JSON
- 本地快照 HTML
- 临时汇总结果

这些内容会频繁变化，也可能包含大量实验噪音。  
它适合作为工作区，不适合作为默认提交区。

所以原则是：

```text
runtime/ = 本地运行输出和实验工作区
```

## 四层分工

```text
practice/            -> 实践代码、测试脚本、小工具源码
runtime/practice/    -> 运行结果、日志、JSON、临时汇总页
public/artifacts/    -> 已确认保留、可提交、可部署的最终静态页面
records              -> 总结后的知识记录，正文引用最终 artifact
```

### 1. `practice/`

这里放：

- smoke test
- provider-native tests
- benchmark
- 辅助小工具
- 之后会继续扩展的实验代码

它是源码层。

### 2. `runtime/practice/`

这里放：

- JSON 输出
- logs
- snapshot markdown
- 临时 HTML 汇总页

它是结果工作区。

### 3. `public/artifacts/`

这里放已经“晋升”为正式内容的结果页：

- 可以进 Git
- 可以部署
- 可以长期引用
- 可以在 `records` 中挂链接

它是最终页面层。

### 4. `records`

这里放：

- 最终结论
- 判断与取舍
- 长期知识记录
- 对外可复用的总结

它是结论层，不是原始输出堆放层。

## 推荐工作流

### 阶段 1：先在 `practice/` 写测试代码

例如：

```text
practice/model/capability-smoke/
practice/model/qwen-native-tools/
practice/model/kimi-official-tools/
practice/model/deepseek-thinking-loop/
```

### 阶段 2：把运行结果落到 `runtime/practice/`

例如：

```text
runtime/practice/model/capability-smoke/
runtime/practice/model/summary/
```

### 阶段 3：确认某个页面值得长期保留

如果某个 HTML / markdown / JSON 汇总已经不再只是临时快照，而是：

- 以后会被 record 引用
- 希望提交进仓库
- 希望随站点部署

那么就把它晋升到：

```text
public/artifacts/...
```

### 阶段 4：在 `records` 中引用最终 artifact

Record 本身负责讲清楚：

- 结论是什么
- 为什么成立
- 哪些模型适合什么角色
- 边界在哪里

而 artifact 页面负责展示：

- 实测矩阵
- 明细状态
- 补充说明

## 当前模型能力矩阵示例

当前工作副本：

```text
runtime/practice/model/summary/model-capability-matrix-2026-05-22.html
```

当前最终引用页：

```text
public/artifacts/model/summary/model-capability-matrix-2026-05-22.html
```

这意味着：

- `runtime/...` 继续作为实验快照工作区
- `public/artifacts/...` 作为最终引用页
- 后续 `records` 应引用 `public/artifacts/...` 这份页面

## 一句话规则

不要把 `runtime/` 直接当成最终发布区。  
先在 `runtime/` 工作，确认后再“晋升”到 `public/artifacts/`，最后由 `records` 引用。
