# Model Gateway / Runtime Adapters

## Purpose

This section studies **Model Gateway / Runtime Adapters** from an engineering best-practice perspective.

## What to collect

- Representative GitHub projects
- Official documentation
- Implementation patterns
- Failure cases
- Compatibility notes
- Reproducible experiments
- Final best-practice conclusions

## Documents

- [Adapter Layer](./adapter-layer.md)
- [Litellm](./litellm.md)
- [Openrouter](./openrouter.md)
- [Vercel Ai Sdk](./vercel-ai-sdk.md)
- [Openai Agents Sdk](./openai-agents-sdk.md)
- [Claude Managed Agent](./claude-managed-agent.md)
- [Google Adk](./google-adk.md)
- [Model Routing](./model-routing.md)
- [Fallback](./fallback.md)
- [Cost Control](./cost-control.md)
- [Compatibility Matrix](./compatibility-matrix.md)

## Suggested experiment format

1. Define a concrete Agent task.
2. Choose 2-5 frameworks/models/tools to compare.
3. Run the same task repeatedly.
4. Record success rate, latency, cost, failure cases and debugging notes.
5. Summarize what should be used in real projects.
