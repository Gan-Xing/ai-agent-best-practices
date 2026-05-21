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

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY ?? "";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_DEFAULT_MODEL ?? "deepseek-v4-pro";
const TIMEOUT_MS = Number.parseInt(
  process.env.DEEPSEEK_THINKING_TIMEOUT_MS ?? "30000",
  10,
);

type Report = {
  generatedAt: string;
  provider: string;
  model: string;
  baseUrl: string;
  probes: Record<string, ProbeResult>;
};

type ToolCall = {
  id: string;
  name: string;
  argumentsText: string;
};

function buildChatUrl() {
  return new URL("chat/completions", ensureTrailingSlash(DEEPSEEK_BASE_URL)).toString();
}

function buildHeaders() {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("Missing DEEPSEEK_API_KEY");
  }

  return {
    authorization: `Bearer ${DEEPSEEK_API_KEY}`,
  };
}

async function requestChat(body: Record<string, unknown>) {
  return requestJson(buildChatUrl(), {
    method: "POST",
    headers: buildHeaders(),
    body,
    timeoutMs: TIMEOUT_MS,
  });
}

function getChoiceMessage(payload: unknown) {
  const record = asRecord(payload);
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const firstChoice = asRecord(choices[0]);
  return asRecord(firstChoice?.message);
}

function getMessageText(payload: unknown) {
  const message = getChoiceMessage(payload);
  return typeof message?.content === "string" ? message.content.trim() : "";
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

function getReasoningContent(payload: unknown) {
  const message = getChoiceMessage(payload);
  return typeof message?.reasoning_content === "string"
    ? message.reasoning_content
    : "";
}

async function runReasoningContentProbe(): Promise<ProbeResult> {
  const result = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: "只回复OK" }],
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getMessageText(result.payload);
  const reasoning = getReasoningContent(result.payload);
  return {
    status: text.includes("OK") && reasoning.length > 0 ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `content=${text} reasoningChars=${reasoning.length}`,
    metadata: { reasoningChars: reasoning.length },
  };
}

async function runJsonModeProbe(): Promise<ProbeResult> {
  const result = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content:
          'Return JSON only: {"provider":"deepseek","ok":true,"mode":"json_mode"}',
      },
    ],
    response_format: { type: "json_object" },
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

async function runStrictFunctionCallingProbe(): Promise<ProbeResult> {
  const result = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content:
          "Call the get_weather tool for Paris with unit celsius. Do not answer normally.",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get current weather",
          strict: true,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              city: { type: "string" },
              unit: { type: "string", enum: ["celsius", "fahrenheit"] },
            },
            required: ["city", "unit"],
          },
        },
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

  const toolCall = getToolCalls(result.payload)[0];
  if (!toolCall) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: "missing tool call",
    };
  }

  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(toolCall.argumentsText) as Record<string, unknown>;
  } catch {}

  const ok = parsed?.city === "Paris" && parsed?.unit === "celsius";
  return {
    status: ok ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `tool=${toolCall.name} args=${toolCall.argumentsText}`,
  };
}

async function createThinkingToolTurn() {
  return requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content:
          "Use the echo_probe tool once with marker deepseek-loop-42, then wait for the tool result.",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "echo_probe",
          description: "Echo the marker",
          parameters: {
            type: "object",
            properties: {
              marker: { type: "string" },
            },
            required: ["marker"],
          },
        },
      },
    ],
  });
}

async function runMissingReasoningFailureProbe(): Promise<ProbeResult> {
  const first = await createThinkingToolTurn();

  if (!first.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: formatError(first.status, first.payload),
    };
  }

  const firstMessage = getChoiceMessage(first.payload);
  const toolCall = getToolCalls(first.payload)[0];
  if (!firstMessage || !toolCall) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: "missing first tool call",
    };
  }

  const second = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content:
          "Use the echo_probe tool once with marker deepseek-loop-42, then wait for the tool result.",
      },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: toolCall.id,
            type: "function",
            function: {
              name: toolCall.name,
              arguments: toolCall.argumentsText,
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: toolCall.id,
        content: '{"marker":"deepseek-loop-42","status":"ok"}',
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "echo_probe",
          description: "Echo the marker",
          parameters: {
            type: "object",
            properties: {
              marker: { type: "string" },
            },
            required: ["marker"],
          },
        },
      },
    ],
  });

  const note = second.ok
    ? getMessageText(second.payload)
    : formatError(second.status, second.payload);
  const mentionsReasoning = /reasoning_content/i.test(note);

  return {
    status: !second.ok && mentionsReasoning ? "PASS" : "FAIL",
    durationMs: first.durationMs + second.durationMs,
    note: note.slice(0, 200),
  };
}

async function runPreservedReasoningSuccessProbe(): Promise<ProbeResult> {
  const first = await createThinkingToolTurn();

  if (!first.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: formatError(first.status, first.payload),
    };
  }

  const firstMessage = getChoiceMessage(first.payload);
  const toolCall = getToolCalls(first.payload)[0];
  const reasoningContent = getReasoningContent(first.payload);
  if (!firstMessage || !toolCall || !reasoningContent) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: "missing first turn tool call or reasoning_content",
    };
  }

  const second = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content:
          "Use the echo_probe tool once with marker deepseek-loop-42, then wait for the tool result.",
      },
      {
        role: "assistant",
        content: null,
        reasoning_content: reasoningContent,
        tool_calls: [
          {
            id: toolCall.id,
            type: "function",
            function: {
              name: toolCall.name,
              arguments: toolCall.argumentsText,
            },
          },
        ],
      },
      {
        role: "tool",
        tool_call_id: toolCall.id,
        content: '{"marker":"deepseek-loop-42","status":"ok"}',
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "echo_probe",
          description: "Echo the marker",
          parameters: {
            type: "object",
            properties: {
              marker: { type: "string" },
            },
            required: ["marker"],
          },
        },
      },
    ],
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
    status: /deepseek-loop-42/i.test(text) ? "PASS" : "FAIL",
    durationMs: first.durationMs + second.durationMs,
    note: `final=${text.slice(0, 160)} reasoningChars=${reasoningContent.length}`,
    metadata: { reasoningChars: reasoningContent.length },
  };
}

async function runContextCachingProbe(): Promise<ProbeResult> {
  const prefix = `CACHE-PREFIX-${"abcdef0123456789".repeat(1000)}`;

  const first = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content: `${prefix}\n\n只回复READY`,
      },
    ],
  });

  if (!first.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs,
      note: formatError(first.status, first.payload),
    };
  }

  const second = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [
      {
        role: "user",
        content: `${prefix}\n\n只回复READY AGAIN`,
      },
    ],
  });

  if (!second.ok) {
    return {
      status: "FAIL",
      durationMs: first.durationMs + second.durationMs,
      note: formatError(second.status, second.payload),
    };
  }

  const secondUsage = asRecord(asRecord(second.payload)?.usage);
  const hitTokens = Number(
    secondUsage?.prompt_cache_hit_tokens ??
      asRecord(secondUsage?.prompt_tokens_details)?.cached_tokens ??
      0,
  );

  return {
    status: hitTokens > 0 ? "PASS" : "FAIL",
    durationMs: first.durationMs + second.durationMs,
    note: `prompt_cache_hit_tokens=${hitTokens}`,
    metadata: {
      promptCacheHitTokens: hitTokens,
    },
  };
}

async function runThinkingDisabledProbe(): Promise<ProbeResult> {
  const result = await requestChat({
    model: DEEPSEEK_MODEL,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: "只回复OK" }],
  });

  if (!result.ok) {
    return {
      status: "FAIL",
      durationMs: result.durationMs,
      note: formatError(result.status, result.payload),
    };
  }

  const text = getMessageText(result.payload);
  const reasoning = getReasoningContent(result.payload);
  return {
    status: text === "OK" && reasoning.length === 0 ? "PASS" : "FAIL",
    durationMs: result.durationMs,
    note: `content=${text} reasoningChars=${reasoning.length}`,
    metadata: { reasoningChars: reasoning.length },
  };
}

async function runThinkingCostComparisonProbe(): Promise<ProbeResult> {
  const prompt = "请简要说明 AI Agent 和普通聊天机器人的区别，用两句话回答。";

  const enabled = await requestChat({
    model: DEEPSEEK_MODEL,
    messages: [{ role: "user", content: prompt }],
  });
  if (!enabled.ok) {
    return {
      status: "FAIL",
      durationMs: enabled.durationMs,
      note: formatError(enabled.status, enabled.payload),
    };
  }

  const disabled = await requestChat({
    model: DEEPSEEK_MODEL,
    thinking: { type: "disabled" },
    messages: [{ role: "user", content: prompt }],
  });
  if (!disabled.ok) {
    return {
      status: "FAIL",
      durationMs: enabled.durationMs + disabled.durationMs,
      note: formatError(disabled.status, disabled.payload),
    };
  }

  const enabledUsage = asRecord(asRecord(enabled.payload)?.usage);
  const disabledUsage = asRecord(asRecord(disabled.payload)?.usage);
  const enabledTotal = Number(enabledUsage?.total_tokens ?? 0);
  const disabledTotal = Number(disabledUsage?.total_tokens ?? 0);
  const enabledReasoning = Number(
    asRecord(enabledUsage?.completion_tokens_details)?.reasoning_tokens ?? 0,
  );
  const disabledReasoning = Number(
    asRecord(disabledUsage?.completion_tokens_details)?.reasoning_tokens ?? 0,
  );

  const ok = disabledReasoning === 0 && disabledTotal <= enabledTotal;
  return {
    status: ok ? "PASS" : "FAIL",
    durationMs: enabled.durationMs + disabled.durationMs,
    note: `enabledTokens=${enabledTotal} disabledTokens=${disabledTotal} enabledReasoning=${enabledReasoning} disabledReasoning=${disabledReasoning} enabledMs=${enabled.durationMs} disabledMs=${disabled.durationMs}`,
    metadata: {
      enabledTokens: enabledTotal,
      disabledTokens: disabledTotal,
      enabledReasoning,
      disabledReasoning,
      enabledDurationMs: enabled.durationMs,
      disabledDurationMs: disabled.durationMs,
    },
  };
}

async function main() {
  const { outPath } = parseCommonArgs(process.argv.slice(2));
  const probes = {
    reasoningContentPresent: await runReasoningContentProbe(),
    thinkingDisabledNoReasoning: await runThinkingDisabledProbe(),
    thinkingCostComparison: await runThinkingCostComparisonProbe(),
    jsonMode: await runJsonModeProbe(),
    strictFunctionCalling: await runStrictFunctionCallingProbe(),
    missingReasoningFailure: await runMissingReasoningFailureProbe(),
    preservedReasoningSuccess: await runPreservedReasoningSuccessProbe(),
    contextCaching: await runContextCachingProbe(),
  };

  const report: Report = {
    generatedAt: new Date().toISOString(),
    provider: "DeepSeek",
    model: DEEPSEEK_MODEL,
    baseUrl: DEEPSEEK_BASE_URL,
    probes,
  };

  const targetPath =
    outPath ??
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../../../runtime/practice/model/deepseek-thinking-loop/latest.json",
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
