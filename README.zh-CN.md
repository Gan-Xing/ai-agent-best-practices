# AI Agent Best Practices

> 面向 AI Agent 工程实践的开源知识库：系统整理模型、Agent Runtime、Skills、Tools、MCP、RAG、Memory、Workflow、Eval、Observability、Sandbox、Adapter 等方向的最佳实践、项目对比和可复现实验。

[English](./README.md) · [文档总览](./docs/00-overview/README.md) · [项目索引](./projects/README.md) · [实验](./experiments/README.md) · [最佳实践](./best-practices/README.md)

## 这个仓库是什么

这不是一个普通 awesome list，也不是概念型 AI Agent 资料站。它的目标是沉淀真正能指导工程实现的内容：

- AI Agent 工程最佳实践
- 高星 GitHub 项目源码学习与横向对比
- 可复现实验与 benchmark
- 模型、工具调用、RAG、Skills、Workflow、Eval、Observability 的真实差异
- 面向真实业务系统的案例研究

## 最终确认的 15 个技术方向

| # | 方向 | 研究重点 |
|---|---|---|
| 01 | [Models](./docs/01-models/README.md) | 不同模型在 Agent 场景下的能力、成本、延迟、Tool Calling、Structured Output、中文、代码、推理 |
| 02 | [Task / Instruction / Structured Output](./docs/02-task-instruction-structured-output/README.md) | 任务定义、系统指令、结构化输出、JSON Schema、约束生成 |
| 03 | [Agent Runtime / State](./docs/03-agent-runtime-state/README.md) | Agent Loop、Planner/Executor、状态、会话、重试、流式输出、暂停恢复 |
| 04 | [Skills / Capability Design](./docs/04-skills-capability-design/README.md) | Skill 的结构、触发、检索、组合、评测，以及 Skill / Tool / Workflow 的边界 |
| 05 | [Tools / Function Calling](./docs/05-tools-function-calling/README.md) | Tool Schema、Tool Registry、参数校验、结果设计、权限、安全 |
| 06 | [MCP](./docs/06-mcp/README.md) | MCP Server / Client、Tools、Resources、Prompts、安全边界、与原生 Tool Calling 的对比 |
| 07 | [RAG / Knowledge System](./docs/07-rag-knowledge-system/README.md) | 文档解析、切分、Embedding、向量检索、混合检索、重排、引用、Agentic RAG |
| 08 | [Memory / Context Engineering](./docs/08-memory-context-engineering/README.md) | 短期记忆、长期记忆、用户记忆、项目记忆、上下文压缩、上下文污染 |
| 09 | [Workflow / Multi-Agent](./docs/09-workflow-multi-agent/README.md) | 顺序工作流、图工作流、Router、Supervisor、Handoff、多 Agent、长期任务 |
| 10 | [Agent UI / Human-in-the-loop](./docs/10-agent-ui-human-in-the-loop/README.md) | Agent 前端、工具调用 UI、运行时间线、人工审批、反馈系统 |
| 11 | [Evaluation / Benchmarking](./docs/11-evaluation-benchmarking/README.md) | Eval Dataset、任务成功率、工具调用正确率、LLM-as-judge、回归测试 |
| 12 | [Observability / Trace / Replay](./docs/12-observability-trace-replay/README.md) | Trace、Run Log、Step Timeline、Tool Call Trace、Token Cost、Replay |
| 13 | [Guardrails / Security / Red Team](./docs/13-guardrails-security-redteam/README.md) | Prompt Injection、数据权限、工具权限、敏感信息、红队测试 |
| 14 | [Sandbox / Browser / Computer Use](./docs/14-sandbox-browser-computer-use/README.md) | 沙箱执行、浏览器 Agent、代码执行、文件系统边界、Shell 安全 |
| 15 | [Model Gateway / Runtime Adapters](./docs/15-model-gateway-runtime-adapters/README.md) | LiteLLM、OpenRouter、Vercel AI SDK、OpenAI Agents SDK、Claude Managed Agent、跨模型兼容性 |

## 最重要的原则

每个方向都要尽量做到：

```txt
高星项目源码学习
+ 横向对比
+ 可复现实验
+ 失败案例记录
+ 最佳实践沉淀
```

## 快速部署静态首页

本仓库自带 `site/` 静态首页和 GitHub Pages 工作流。推送到 GitHub 后，进入：

```txt
Settings → Pages → Source → GitHub Actions
```

然后运行 workflow，即可部署一个简单的项目首页。
