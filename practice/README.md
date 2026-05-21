# Practice

`practice/` 用来放这个项目里持续积累的实践代码。

这里不是仓库维护脚本区，也不是网站运行时代码区，而是：

- 自己验证过的实验代码
- 之后还会继续扩展的小工具
- 按主题沉淀的实践过程

目录约定：

```text
practice/
  model/
  workflow/
  rag/
  security/
```

每个主题下面再按具体实践拆子目录，例如：

```text
practice/model/capability-smoke/
```

这样后面加新的测试、benchmark、对比工具时，不会混进 `scripts/`。

## Source vs Output

这里再明确一下这个项目里的四层分工：

```text
practice/            -> 实践代码、测试脚本、小工具源码
runtime/practice/    -> JSON、日志、临时 HTML、测试快照
public/artifacts/    -> 已确认保留、可提交、可部署的最终静态页面
records              -> 总结后的知识记录，正文引用最终 artifact
```

其中：

- `practice/` 是源码层
- `runtime/practice/` 是工作区结果层
- `public/artifacts/` 是最终页面层
- `records` 是结论层

`runtime/` 当前被 `.gitignore` 忽略，是为了让运行结果和正式内容分开。  
当某个页面已经从“实验快照”变成“最终结论附件”时，应把它从
`runtime/practice/...` 晋升到 `public/artifacts/...`，再由 `records`
去引用它。

例如当前模型能力矩阵：

```text
工作副本：
runtime/practice/model/summary/model-capability-matrix-2026-05-17.html

最终引用页：
public/artifacts/model/summary/model-capability-matrix-2026-05-17.html
```
