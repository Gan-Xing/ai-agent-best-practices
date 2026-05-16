# GitHub Repo Category Mapping

Use this only when the primary category is not obvious from the repo fact pack.

## Category Hints

- `01 models`
  - model serving, inference, checkpoints, quantization, latency, reasoning
- `02 instruction`
  - prompt engineering, instruction tuning, structured output, schema guidance
- `03 runtime`
  - agent runtime, agent loop, state, sessions, retries, streaming
- `04 skills`
  - skills, plugins, capability packs, reusable agent abilities
- `05 tools`
  - tool calling, function calling, schemas, validation, permissions, CLIs
- `06 mcp`
  - MCP servers, Model Context Protocol, tools/resources/prompts exposure
- `07 rag`
  - retrieval, embedding, chunking, vector search, citations
- `08 memory`
  - memory, profiles, episodic memory, context persistence
- `09 workflow`
  - orchestration, graphs, routers, supervisors, handoffs, multi-agent flow
- `10 agent-ui`
  - chat UI, operator consoles, timelines, approval interfaces, dashboards
- `11 evaluation`
  - benchmarks, evals, graders, judges, regression suites
- `12 trace`
  - tracing, observability, replay, telemetry, logging
- `13 security`
  - prompt injection defense, auth, policies, guardrails, red teaming
- `14 sandbox`
  - browser agents, shell execution, code execution, isolated containers
- `15 adapters`
  - model gateways, proxies, provider adapters, OpenRouter, LiteLLM, SDK bridges

## Tie-Breaking

- Prefer the category that best explains why you would reopen this repo later.
- Prefer the protocol or workflow layer over generic implementation language.
- Use `secondaryCategoryCodes` only when another category would genuinely be a
  likely future retrieval path.
