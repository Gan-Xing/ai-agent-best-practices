# AI Agent Best Practices

> A practical, engineering-first knowledge base for building, comparing, evaluating, and operating production-ready AI Agent systems.

[中文说明](./README.zh-CN.md) · [Docs](./docs/00-overview/README.md) · [Projects](./projects/README.md) · [Experiments](./experiments/README.md) · [Best Practices](./best-practices/README.md) · [Static Site](./site/index.html)

## What this repo is

This repository is **not just an awesome list**. It is designed as an open-source AI Agent engineering handbook that collects:

- **Best practices** for production-grade AI Agent systems
- **Project comparisons** across high-star GitHub projects and frameworks
- **Reproducible experiments** for models, runtime, tools, RAG, skills, memory, evaluation, and observability
- **Case studies** for real-world Agent products and internal automation systems
- **Templates** for contributors to add structured notes, benchmarks, and experiments

## Core map

```txt
Models
  ↓
Task / Instruction / Structured Output
  ↓
Agent Runtime / State
  ↓
Skills / Capability Design
  ↓
Tools / Function Calling + MCP
  ↓
RAG / Knowledge + Memory / Context
  ↓
Workflow / Multi-Agent + Agent UI
  ↓
Evaluation + Observability + Guardrails
  ↓
Sandbox / Browser / Computer Use
  ↓
Model Gateway / Runtime Adapters
```

## 15 engineering directions

| # | Direction | Focus |
|---|---|---|
| 01 | [Models](./docs/01-models/README.md) | Model capability, reasoning, coding, tool calling, structured output, Chinese ability, cost, latency |
| 02 | [Task / Instruction / Structured Output](./docs/02-task-instruction-structured-output/README.md) | Task design, instruction design, JSON schema, constrained generation |
| 03 | [Agent Runtime / State](./docs/03-agent-runtime-state/README.md) | Agent loop, planner-executor, state, session, retry, streaming, pause/resume |
| 04 | [Skills / Capability Design](./docs/04-skills-capability-design/README.md) | Skill structure, triggering, retrieval, composition, skill vs tool vs workflow |
| 05 | [Tools / Function Calling](./docs/05-tools-function-calling/README.md) | Tool schema, registry, validation, result design, permissions |
| 06 | [MCP](./docs/06-mcp/README.md) | MCP server/client, tools, resources, prompts, security, native tools comparison |
| 07 | [RAG / Knowledge System](./docs/07-rag-knowledge-system/README.md) | Parsing, chunking, embedding, retrieval, rerank, citation, agentic RAG |
| 08 | [Memory / Context Engineering](./docs/08-memory-context-engineering/README.md) | Short-term memory, long-term memory, user/project memory, context compression |
| 09 | [Workflow / Multi-Agent](./docs/09-workflow-multi-agent/README.md) | Sequential, graph, router, supervisor, handoff, long-running workflow |
| 10 | [Agent UI / Human-in-the-loop](./docs/10-agent-ui-human-in-the-loop/README.md) | Agent chat UI, generative UI, approval UI, timeline UI, feedback UI |
| 11 | [Evaluation / Benchmarking](./docs/11-evaluation-benchmarking/README.md) | Eval dataset, task success rate, tool correctness, LLM-as-judge, regression |
| 12 | [Observability / Trace / Replay](./docs/12-observability-trace-replay/README.md) | Traces, run logs, tool call trace, token cost, latency, replay |
| 13 | [Guardrails / Security / Red Team](./docs/13-guardrails-security-redteam/README.md) | Prompt injection, data permission, tool permission, red-team testing |
| 14 | [Sandbox / Browser / Computer Use](./docs/14-sandbox-browser-computer-use/README.md) | Code execution, browser agent, computer use, filesystem boundary |
| 15 | [Model Gateway / Runtime Adapters](./docs/15-model-gateway-runtime-adapters/README.md) | LiteLLM, OpenRouter, Vercel AI SDK, OpenAI Agents SDK, Claude Managed Agent, compatibility |

## Repository structure

```txt
ai-agent-best-practices/
├── docs/              # Systematic knowledge base by engineering direction
├── comparisons/       # Horizontal comparisons between frameworks, models, runtimes and tools
├── experiments/       # Reproducible experiments and benchmarks
├── best-practices/    # Final engineering conclusions distilled from docs and experiments
├── case-studies/      # Real-world Agent systems and product case studies
├── projects/          # High-star GitHub projects grouped by topic
├── templates/         # Contribution templates
├── site/              # Static landing page for GitHub Pages
├── assets/            # Diagrams, screenshots and banners
└── .github/           # GitHub workflows and contribution metadata
```

## Contribution principle

Every useful note should try to answer:

1. What problem does it solve?
2. Which GitHub projects or official docs can be studied?
3. What can be compared or benchmarked?
4. What is the engineering best practice?
5. Can it be applied to a real Agent project?

## Current status

This repository is in the initial skeleton stage. The first milestone is to build the project index, collect representative projects, and run the first model/tool-calling benchmark.

## License

MIT
