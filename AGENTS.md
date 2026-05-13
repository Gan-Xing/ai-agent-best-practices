<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:repo-local-skills -->
# Repo-Local Skills

When the user asks to use `knowledge-record-entry`, or asks to draft, record,
append, import, or sync KnowledgeRecord content, read and follow:

```text
skills/knowledge-record-entry/SKILL.md
```

For that workflow, do not write `content/knowledge/**/*.json` or sync the
server until the user explicitly confirms the draft record.
<!-- END:repo-local-skills -->
