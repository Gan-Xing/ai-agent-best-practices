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

const QWEN_API_KEY = process.env.QWEN_API_KEY ?? "";
const QWEN_BASE_URL =
  process.env.QWEN_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1";
const QWEN_MODEL = process.env.QWEN_DEFAULT_MODEL ?? "qwen3.6-plus";
const TIMEOUT_MS = Number.parseInt(
  process.env.QWEN_NATIVE_TIMEOUT_MS ?? "45000",
  10,
);
const FILE_SEARCH_VECTOR_STORE_ID =
  process.env.QWEN_FILE_SEARCH_VECTOR_STORE_ID ??
  process.env.MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID ??
  "";
const QWEN_MCP_SERVER_URL =
  process.env.QWEN_MCP_SERVER_URL ??
  process.env.MODEL_CAPABILITY_MCP_SERVER_URL ??
  "https://aiagent.byganxing.com/api/mcp/dice/sse";
const QWEN_MCP_SERVER_LABEL =
  process.env.QWEN_MCP_SERVER_LABEL ??
  process.env.MODEL_CAPABILITY_MCP_SERVER_LABEL ??
  "demo";
const QWEN_MCP_SERVER_DESCRIPTION =
  process.env.QWEN_MCP_SERVER_DESCRIPTION ??
  process.env.MODEL_CAPABILITY_MCP_SERVER_DESCRIPTION ??
  "AI Agent Best Practices deterministic dice MCP server. Use roll_dice for dice expressions.";
const QWEN_MCP_PROMPT =
  process.env.QWEN_MCP_PROMPT ??
  "必须调用 MCP server 的 roll_dice 工具计算 2d4+1，并只返回工具结果里的 total。不能自己心算。";
const QWEN_MCP_AUTH_TOKEN = process.env.QWEN_MCP_AUTH_TOKEN ?? "";

type Report = {
  generatedAt: string;
  provider: string;
  model: string;
  baseUrl: string;
  probes: Record<string, ProbeResult>;
};

function buildResponsesUrl() {
  return new URL("responses", ensureTrailingSlash(QWEN_BASE_URL)).toString();
}

function buildHeaders() {
  if (!QWEN_API_KEY) {
    throw new Error("Missing QWEN_API_KEY");
  }

  return {
    authorization: `Bearer ${QWEN_API_KEY}`,
  };
}

function getOutputItems(payload: unknown) {
  const record = asRecord(payload);
  return Array.isArray(record?.output) ? record.output : [];
}

function getOutputText(payload: unknown) {
  const record = asRecord(payload);
  if (typeof record?.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const texts: string[] = [];
  for (const item of getOutputItems(payload)) {
    const itemRecord = asRecord(item);
    if (itemRecord?.type !== "message") {
      continue;
    }
    const content = Array.isArray(itemRecord.content) ? itemRecord.content : [];
    for (const part of content) {
      const partRecord = asRecord(part);
      if (
        partRecord?.type === "output_text" &&
        typeof partRecord.text === "string"
      ) {
        texts.push(partRecord.text);
      }
    }
  }

  return texts.join("").trim();
}

function countOutputType(payload: unknown, type: string) {
  return getOutputItems(payload)
    .map((item) => asRecord(item))
    .filter((item) => item?.type === type).length;
}

function getOutputTypes(payload: unknown) {
  return getOutputItems(payload)
    .map((item) => asRecord(item)?.type)
    .filter((type): type is string => typeof type === "string");
}

async function createResponse(body: Record<string, unknown>) {
  return requestJson(buildResponsesUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body,
    timeoutMs: TIMEOUT_MS,
  });
}

async function runPreviousResponseMemoryProbe(): Promise<ProbeResult> {
  const first = await createResponse({
    model: QWEN_MODEL,
    input: "我的名字是张三丰，请记住。",
  });

  if (!first.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: formatError(first.status, first.payload),
    };
  }

  const firstRecord = asRecord(first.payload);
  const responseId = typeof firstRecord?.id === "string" ? firstRecord.id : "";

  if (!responseId) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: "missing response id in first turn",
    };
  }

  const second = await createResponse({
    model: QWEN_MODEL,
    input: "你还记得我的名字吗？只回答名字。",
    previous_response_id: responseId,
  });

  if (!second.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs + second.durationMs,
      note: formatError(second.status, second.payload),
    };
  }

  const text = getOutputText(second.payload);
  return {
    status: text.includes("张三丰") ? "PASS" : "FAIL",
    durationMs: first.durationMs + second.durationMs,
    note: `final=${text.slice(0, 120)} previous_response_id=${responseId}`,
    metadata: { responseId },
  };
}

async function runWebSearchProbe(): Promise<ProbeResult> {
  const result = await createResponse({
    model: QWEN_MODEL,
    input: "帮我找一下阿里云官网，并用一句话总结首页主要内容。",
    tools: [{ type: "web_search" }],
    reasoning: { effort: "medium" },
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getOutputText(result.payload);
  const webSearchCalls = countOutputType(result.payload, "web_search_call");
  return {
    status: text && webSearchCalls > 0 ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `text=${text.slice(0, 140)} webSearchCalls=${webSearchCalls}`,
    metadata: { webSearchCalls },
  };
}

async function runCodeInterpreterProbe(): Promise<ProbeResult> {
  const result = await createResponse({
    model: QWEN_MODEL,
    input: "请计算12的三次方，只返回最终整数结果。",
    tools: [{ type: "code_interpreter" }],
    enable_thinking: true,
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getOutputText(result.payload);
  const codeCalls = countOutputType(result.payload, "code_interpreter_call");
  const usageRecord = asRecord(asRecord(result.payload)?.usage);
  const xTools = asRecord(usageRecord?.x_tools);
  const codeCount =
    Number(asRecord(xTools?.code_interpreter)?.count ?? codeCalls) || codeCalls;
  return {
    status: text.includes("1728") && codeCount > 0 ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `text=${text.slice(0, 140)} codeInterpreterCalls=${codeCalls} usageCount=${codeCount}`,
    metadata: { codeCalls, codeCount },
  };
}

async function runWebExtractorProbe(): Promise<ProbeResult> {
  const result = await createResponse({
    model: QWEN_MODEL,
    input: "请搜索并访问 example.com，然后告诉我页面标题。",
    tools: [
      { type: "web_search" },
      { type: "web_extractor" },
    ],
    enable_thinking: true,
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getOutputText(result.payload);
  const webExtractorCalls = countOutputType(result.payload, "web_extractor_call");
  const ok = webExtractorCalls > 0 && /Example Domain/i.test(text);

  return {
    status: ok ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `text=${text.slice(0, 160)} webExtractorCalls=${webExtractorCalls}`,
    metadata: { webExtractorCalls },
  };
}

async function runMcpProbe(): Promise<ProbeResult> {
  const mcpTool: Record<string, unknown> = {
    type: "mcp",
    server_protocol: "sse",
    server_label: QWEN_MCP_SERVER_LABEL,
    server_description: QWEN_MCP_SERVER_DESCRIPTION,
    server_url: QWEN_MCP_SERVER_URL,
  };

  if (QWEN_MCP_AUTH_TOKEN) {
    mcpTool.headers = {
      Authorization: `Bearer ${QWEN_MCP_AUTH_TOKEN}`,
    };
  }

  const result = await createResponse({
    model: QWEN_MODEL,
    input: QWEN_MCP_PROMPT,
    tools: [mcpTool],
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getOutputText(result.payload);
  const mcpCalls = countOutputType(result.payload, "mcp_call");
  const mcpListTools = countOutputType(result.payload, "mcp_list_tools");
  const outputTypes = getOutputTypes(result.payload);
  const ok = mcpCalls > 0 && Boolean(text);

  return {
    status: ok ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `text=${text.slice(0, 160)} mcpCalls=${mcpCalls} mcpListTools=${mcpListTools} outputTypes=${outputTypes.join(",")}`,
    metadata: {
      mcpCalls,
      mcpListTools,
      outputTypes,
      serverUrl: QWEN_MCP_SERVER_URL,
      serverLabel: QWEN_MCP_SERVER_LABEL,
    },
  };
}

async function runFileSearchProbe(): Promise<ProbeResult> {
  if (!FILE_SEARCH_VECTOR_STORE_ID) {
    return {
      status: "SKIP",
      durationMs: 0,
      note: "Set QWEN_FILE_SEARCH_VECTOR_STORE_ID or MODEL_CAPABILITY_FILE_SEARCH_VECTOR_STORE_ID to enable file_search.",
    };
  }

  const result = await createResponse({
    model: QWEN_MODEL,
    input: "请用一句话概括知识库的主题。",
    tools: [
      {
        type: "file_search",
        vector_store_ids: [FILE_SEARCH_VECTOR_STORE_ID],
      },
    ],
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getOutputText(result.payload);
  const fileSearchCalls = countOutputType(result.payload, "file_search_call");
  return {
    status: text && fileSearchCalls > 0 ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `text=${text.slice(0, 140)} fileSearchCalls=${fileSearchCalls}`,
    metadata: {
      fileSearchCalls,
      vectorStoreId: FILE_SEARCH_VECTOR_STORE_ID,
    },
  };
}

async function safelyRunProbe(
  fn: () => Promise<ProbeResult>,
): Promise<ProbeResult> {
  try {
    return await fn();
  } catch (error) {
    return {
      status: "FAIL",
      durationMs: 0,
      note: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function main() {
  const { outPath } = parseCommonArgs(process.argv.slice(2));
  const probes = {
    previousResponseMemory: await safelyRunProbe(runPreviousResponseMemoryProbe),
    webSearch: await safelyRunProbe(runWebSearchProbe),
    codeInterpreter: await safelyRunProbe(runCodeInterpreterProbe),
    webExtractor: await safelyRunProbe(runWebExtractorProbe),
    mcp: await safelyRunProbe(runMcpProbe),
    fileSearch: await safelyRunProbe(runFileSearchProbe),
  };

  const report: Report = {
    generatedAt: new Date().toISOString(),
    provider: "Qwen / Bailian",
    model: QWEN_MODEL,
    baseUrl: QWEN_BASE_URL,
    probes,
  };

  const targetPath =
    outPath ??
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../runtime/practice/model/qwen-native-tools/latest.json",
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
