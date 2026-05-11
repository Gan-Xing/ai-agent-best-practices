# Agent Engineering Map

## Why this map exists

Agent systems are no longer just chatbots. A useful Agent system usually includes model selection, task design, runtime, tools, skills, memory, RAG, workflow, evaluation, observability, safety, UI, sandboxing and adapter layers.

## Engineering map

```mermaid
graph TD
  A[Models] --> B[Task & Instruction]
  B --> C[Agent Runtime & State]
  C --> D[Skills]
  D --> E[Tools & Function Calling]
  D --> F[MCP]
  E --> G[RAG / Knowledge]
  F --> G
  G --> H[Memory / Context]
  H --> I[Workflow / Multi-Agent]
  I --> J[Agent UI / Human Approval]
  I --> K[Evaluation]
  I --> L[Observability / Replay]
  K --> M[Guardrails / Security]
  L --> M
  M --> N[Sandbox / Computer Use]
  N --> O[Model Gateway / Runtime Adapters]
```

## Principle

Each topic should be backed by representative projects, experiments, comparisons, and final best practices.
