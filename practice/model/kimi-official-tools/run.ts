import { readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  asRecord,
  ensureTrailingSlash,
  formatError,
  parseCommonArgs,
  type ProbeResult,
  requestJson,
  writeReport,
} from "../shared/common";

const MOONSHOT_API_KEY = process.env.MOONSHOT_API_KEY ?? "";
const MOONSHOT_BASE_URL = process.env.MOONSHOT_BASE_URL ?? "https://api.moonshot.cn/v1";
const MOONSHOT_MODEL = "kimi-k2.6";
const TIMEOUT_MS = Number.parseInt(
  process.env.KIMI_OFFICIAL_TOOLS_TIMEOUT_MS ?? "30000",
  10,
);

type ToolCall = {
  id: string;
  name: string;
  argumentsText: string;
};

type Report = {
  generatedAt: string;
  provider: string;
  model: string;
  baseUrl: string;
  probes: Record<string, ProbeResult>;
};

function buildHeaders(extra?: Record<string, string>) {
  if (!MOONSHOT_API_KEY) {
    throw new Error("Missing MOONSHOT_API_KEY");
  }

  return {
    authorization: `Bearer ${MOONSHOT_API_KEY}`,
    ...(extra ?? {}),
  };
}

function buildChatUrl() {
  return new URL("chat/completions", ensureTrailingSlash(MOONSHOT_BASE_URL)).toString();
}

function buildFormulaToolsUrl(uri: string) {
  return new URL(`formulas/${uri}/tools`, ensureTrailingSlash(MOONSHOT_BASE_URL)).toString();
}

function buildFormulaFiberUrl(uri: string) {
  return new URL(`formulas/${uri}/fibers`, ensureTrailingSlash(MOONSHOT_BASE_URL)).toString();
}

function buildFilesUrl() {
  return new URL("files", ensureTrailingSlash(MOONSHOT_BASE_URL)).toString();
}

function buildFileContentUrl(fileId: string) {
  return new URL(`files/${fileId}/content`, ensureTrailingSlash(MOONSHOT_BASE_URL)).toString();
}

function getChoiceMessage(payload: unknown) {
  const record = asRecord(payload);
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const firstChoice = asRecord(choices[0]);
  return asRecord(firstChoice?.message);
}

function getToolCalls(payload: unknown): ToolCall[] {
  const message = getChoiceMessage(payload);
  const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
  return toolCalls
    .map((toolCall) => asRecord(toolCall))
    .map((toolCall) => {
      const functionBlock = asRecord(toolCall?.function);
      return {
        id: typeof toolCall?.id === "string" ? toolCall.id : "",
        name: typeof functionBlock?.name === "string" ? functionBlock.name : "",
        argumentsText:
          typeof functionBlock?.arguments === "string"
            ? functionBlock.arguments
            : "",
      };
    })
    .filter((toolCall) => Boolean(toolCall.name));
}

async function requestChat(body: Record<string, unknown>) {
  return requestJson(buildChatUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body,
    timeoutMs: TIMEOUT_MS,
  });
}

async function getFormulaTools(uri: string) {
  return requestJson(buildFormulaToolsUrl(uri), {
    method: "GET",
    headers: buildHeaders(),
    timeoutMs: TIMEOUT_MS,
  });
}

async function callFormulaFiber(uri: string, name: string, args: unknown) {
  return requestJson(buildFormulaFiberUrl(uri), {
    method: "POST",
    headers: buildHeaders(),
    body: {
      name,
      arguments: typeof args === "string" ? args : JSON.stringify(args),
    },
    timeoutMs: TIMEOUT_MS,
  });
}

function getMessageText(payload: unknown) {
  const message = getChoiceMessage(payload);
  return typeof message?.content === "string" ? message.content.trim() : "";
}

async function runBuiltinWebSearchProbe(): Promise<ProbeResult> {
  const first = await requestChat({
    model: MOONSHOT_MODEL,
    messages: [
      { role: "system", content: "你是 Kimi。" },
      {
        role: "user",
        content: "请联网搜索 Moonshot AI Context Caching 是什么，并用一句中文简短总结。",
      },
    ],
    tools: [
      {
        type: "builtin_function",
        function: { name: "$web_search" },
      },
    ],
    thinking: { type: "disabled" },
  });

  if (!first.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: formatError(first.status, first.payload),
    };
  }

  const firstMessage = getChoiceMessage(first.payload);
  const toolCalls = getToolCalls(first.payload);
  const firstToolCall = toolCalls[0];

  if (!firstMessage || !firstToolCall) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: "missing builtin web search tool call",
    };
  }

  const second = await requestChat({
    model: MOONSHOT_MODEL,
    messages: [
      { role: "system", content: "你是 Kimi。" },
      {
        role: "user",
        content: "请联网搜索 Moonshot AI Context Caching 是什么，并用一句中文简短总结。",
      },
      firstMessage,
      {
        role: "tool",
        tool_call_id: firstToolCall.id,
        name: firstToolCall.name,
        content: firstToolCall.argumentsText,
      },
    ],
    tools: [
      {
        type: "builtin_function",
        function: { name: "$web_search" },
      },
    ],
    thinking: { type: "disabled" },
  });

  if (!second.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs + second.durationMs,
      note: formatError(second.status, second.payload),
    };
  }

  const text = getMessageText(second.payload);
  return {
    status: text ? "PASS" : "FAIL",
    durationMs: first.durationMs + second.durationMs,
    note: `text=${text.slice(0, 160)} tool=${firstToolCall.name}`,
    metadata: { tool: firstToolCall.name },
  };
}

async function runFormulaDiscoveryProbe(
  name: string,
  uri: string,
): Promise<ProbeResult> {
  const result = await getFormulaTools(uri);

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const payload = asRecord(result.payload);
  const tools = Array.isArray(payload?.tools) ? payload.tools : [];
  const firstTool = asRecord(tools[0]);
  const functionBlock = asRecord(firstTool?.function);
  const toolName =
    typeof functionBlock?.name === "string" ? functionBlock.name : "";

  return {
    status: tools.length > 0 ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `${name} tools=${tools.length} first=${toolName || "<none>"}`,
    metadata: { uri, tools: tools.length, toolName },
  };
}

async function runFormulaExecutionProbe(
  formulaUri: string,
  prompt: string,
  expectedPattern: RegExp,
): Promise<ProbeResult> {
  const toolsResult = await getFormulaTools(formulaUri);
  if (!toolsResult.ok) {
    return {
      status: "FAIL",
      durationMs: toolsResult.durationMs,
      note: formatError(toolsResult.status, toolsResult.payload),
    };
  }

  const payload = asRecord(toolsResult.payload);
  const tools = Array.isArray(payload?.tools) ? payload.tools : [];

  const first = await requestChat({
    model: MOONSHOT_MODEL,
    messages: [{ role: "user", content: prompt }],
    tools,
    thinking: { type: "disabled" },
  });

  if (!first.ok) {
    return {
      status: "FAIL",
      durationMs: toolsResult.durationMs + first.durationMs,
      note: formatError(first.status, first.payload),
    };
  }

  const toolCalls = getToolCalls(first.payload);
  const firstMessage = getChoiceMessage(first.payload);
  const firstToolCall = toolCalls[0];

  if (!firstToolCall || !firstMessage) {
    return {
      status: "FAIL",
      durationMs: toolsResult.durationMs + first.durationMs,
      note: "missing tool call on first turn",
    };
  }

  let parsedArgs: unknown = firstToolCall.argumentsText;
  try {
    parsedArgs = JSON.parse(firstToolCall.argumentsText);
  } catch {}

  const fiber = await callFormulaFiber(formulaUri, firstToolCall.name, parsedArgs);
  if (!fiber.ok) {
    return {
      status: "FAIL",
      durationMs:
        toolsResult.durationMs + first.durationMs + fiber.durationMs,
      note: formatError(fiber.status, fiber.payload),
    };
  }

  const second = await requestChat({
    model: MOONSHOT_MODEL,
    messages: [
      { role: "user", content: prompt },
      firstMessage,
      {
        role: "tool",
        tool_call_id: firstToolCall.id,
        name: firstToolCall.name,
        content: JSON.stringify(fiber.payload),
      },
    ],
    tools,
    thinking: { type: "disabled" },
  });

  if (!second.ok) {
    return {
      status: "FAIL",
      durationMs:
        toolsResult.durationMs +
        first.durationMs +
        fiber.durationMs +
        second.durationMs,
      note: formatError(second.status, second.payload),
    };
  }

  const text = getMessageText(second.payload);
  return {
    status: expectedPattern.test(text) ? "PASS" : "FAIL",
    durationMs:
      toolsResult.durationMs +
      first.durationMs +
      fiber.durationMs +
      second.durationMs,
    note: `tool=${firstToolCall.name} text=${text.slice(0, 160)}`,
    metadata: {
      formulaUri,
      tool: firstToolCall.name,
    },
  };
}

async function runMemoryWriteReadProbe(): Promise<ProbeResult> {
  const key = `codex-memory-${Date.now()}`;
  const store = await callFormulaFiber("moonshot/memory:latest", "memory", {
    action: "store",
    key,
    data: { city: "Shanghai", source: "codex" },
  });

  if (!store.ok) {
    return {
      status: "FAIL",
      durationMs: store.durationMs,
      note: formatError(store.status, store.payload),
    };
  }

  const retrieve = await callFormulaFiber("moonshot/memory:latest", "memory", {
    action: "retrieve",
    key,
  });

  if (!retrieve.ok) {
    return {
      status: "FAIL",
      durationMs: store.durationMs + retrieve.durationMs,
      note: formatError(retrieve.status, retrieve.payload),
    };
  }

  const retrieveContext = asRecord(asRecord(retrieve.payload)?.context);
  const output = String(retrieveContext?.output ?? "");
  return {
    status: /Shanghai/i.test(output) ? "PASS" : "FAIL",
    durationMs: store.durationMs + retrieve.durationMs,
    note: `key=${key} retrieve=${output.slice(0, 160)}`,
    metadata: { key },
  };
}

async function runJsonModeProbe(): Promise<ProbeResult> {
  const result = await requestChat({
    model: MOONSHOT_MODEL,
    messages: [
      {
        role: "user",
        content:
          'Return JSON only: {"provider":"kimi","ok":true,"mode":"json_mode"}',
      },
    ],
    response_format: { type: "json_object" },
    temperature: 1,
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getMessageText(result.payload);
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      status: parsed.ok === true ? "PASS" : "FAIL",
      durationMs: result.durationMs,
      note: `json keys=${Object.keys(parsed).join(",")}`,
    };
  } catch (error) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: error instanceof Error ? error.message : "invalid json",
    };
  }
}

async function runFileQaProbe(): Promise<ProbeResult> {
  const fixturePath = path.join(os.tmpdir(), "kimi-file-qa-fixture.txt");
  const fixtureContent =
    "This file is about AI Agent Best Practices. The key city is Shanghai.";
  await writeFile(fixturePath, fixtureContent, "utf8");
  const buffer = await readFile(fixturePath);

  const form = new FormData();
  form.append("purpose", "file-extract");
  form.append("file", new Blob([buffer]), "kimi-file-qa-fixture.txt");

  const startedAt = Date.now();
  const upload = await fetch(buildFilesUrl(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${MOONSHOT_API_KEY}`,
    },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const uploadDurationMs = Date.now() - startedAt;
  const uploadText = await upload.text();
  let uploadPayload: unknown;

  try {
    uploadPayload = JSON.parse(uploadText);
  } catch {
    uploadPayload = { rawText: uploadText };
  }

  if (!upload.ok) {
    return {
      status: "FAIL",
      durationMs: uploadDurationMs,
      note: formatError(upload.status, uploadPayload),
    };
  }

  const uploadRecord = asRecord(uploadPayload);
  const fileId = typeof uploadRecord?.id === "string" ? uploadRecord.id : "";

  if (!fileId) {
    return {
      status: "FAIL",
      durationMs: uploadDurationMs,
      note: "missing file id after upload",
    };
  }

  const contentStartedAt = Date.now();
  const contentResponse = await fetch(buildFileContentUrl(fileId), {
    method: "GET",
    headers: {
      authorization: `Bearer ${MOONSHOT_API_KEY}`,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const contentDurationMs = Date.now() - contentStartedAt;
  const extractedText = await contentResponse.text();

  if (!contentResponse.ok) {
    return {
      status: "FAIL",
      durationMs: uploadDurationMs + contentDurationMs,
      note: `file content ${contentResponse.status}: ${extractedText.slice(0, 300)}`,
    };
  }

  const qa = await requestChat({
    model: MOONSHOT_MODEL,
    messages: [
      {
        role: "system",
        content: `以下是文件内容：\n${extractedText.slice(0, 2000)}`,
      },
      {
        role: "user",
        content: "这个文件的关键城市是什么？只回答城市名。",
      },
    ],
    thinking: { type: "disabled" },
  });

  if (!qa.ok) {
    return {
      status: "FAIL",
      durationMs: uploadDurationMs + contentDurationMs + qa.durationMs,
      note: formatError(qa.status, qa.payload),
    };
  }

  const text = getMessageText(qa.payload);
  return {
    status: /Shanghai|上海/i.test(text) ? "PASS" : "FAIL",
    durationMs: uploadDurationMs + contentDurationMs + qa.durationMs,
    note: `fileId=${fileId} answer=${text.slice(0, 120)}`,
    metadata: { fileId },
  };
}

async function main() {
  const { outPath } = parseCommonArgs(process.argv.slice(2));
  const probes = {
    builtinWebSearch: await runBuiltinWebSearchProbe(),
    discoverWebSearchFormula: await runFormulaDiscoveryProbe(
      "web-search",
      "moonshot/web-search:latest",
    ),
    discoverFetchFormula: await runFormulaDiscoveryProbe(
      "fetch",
      "moonshot/fetch:latest",
    ),
    discoverQuickjsFormula: await runFormulaDiscoveryProbe(
      "quickjs",
      "moonshot/quickjs:latest",
    ),
    discoverMemoryFormula: await runFormulaDiscoveryProbe(
      "memory",
      "moonshot/memory:latest",
    ),
    discoverCodeRunnerFormula: await runFormulaDiscoveryProbe(
      "code_runner",
      "moonshot/code-runner:latest",
    ),
    formulaFetchExecution: await runFormulaExecutionProbe(
      "moonshot/fetch:latest",
      "请使用 fetch 工具读取 https://example.com ，只告诉我页面标题。",
      /Example Domain/i,
    ),
    formulaQuickjsExecution: await runFormulaExecutionProbe(
      "moonshot/quickjs:latest",
      "请使用 quickjs 计算 2 的 20 次方，只返回数字。",
      /1048576/,
    ),
    formulaCodeRunnerExecution: await runFormulaExecutionProbe(
      "moonshot/code-runner:latest",
      "请使用 code_runner 计算 2 的 10 次方，只返回数字。",
      /1024/,
    ),
    memoryWriteRead: await runMemoryWriteReadProbe(),
    jsonMode: await runJsonModeProbe(),
    fileQa: await runFileQaProbe(),
  };

  const report: Report = {
    generatedAt: new Date().toISOString(),
    provider: "Moonshot / Kimi",
    model: MOONSHOT_MODEL,
    baseUrl: MOONSHOT_BASE_URL,
    probes,
  };

  const targetPath =
    outPath ??
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../runtime/practice/model/kimi-official-tools/latest.json",
    );

  await writeReport(targetPath, report);
  console.table(
    Object.entries(probes).map(([name, probe]) => ({
      probe: name,
      status: probe.status,
      note: probe.note.slice(0, 120),
    })),
  );
  console.log(`Report written to ${targetPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
