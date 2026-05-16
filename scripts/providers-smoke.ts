import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: process.env.PROVIDER_SMOKE_ENV_FILE ?? ".env" });

type ProviderDefinition = {
  slug: string;
  label: string;
  apiKeyEnv: string;
  baseUrlEnv: string;
  modelEnv: string;
  defaultBaseUrl: string;
};

type SmokeStatus = "PASS" | "FAIL" | "SKIP";

type ProbeResult = {
  status: SmokeStatus;
  durationMs: number;
  note: string;
  usage?: unknown;
};

type ProviderResult = {
  provider: string;
  model: string;
  baseUrl: string;
  text: ProbeResult;
  json: ProbeResult;
  tools: ProbeResult;
};

const PROVIDERS: ProviderDefinition[] = [
  {
    slug: "deepseek",
    label: "DeepSeek",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    modelEnv: "DEEPSEEK_DEFAULT_MODEL",
    defaultBaseUrl: "https://api.deepseek.com",
  },
  {
    slug: "minimax",
    label: "MiniMax",
    apiKeyEnv: "MINIMAX_API_KEY",
    baseUrlEnv: "MINIMAX_BASE_URL",
    modelEnv: "MINIMAX_MODEL",
    defaultBaseUrl: "https://api.minimaxi.com/v1",
  },
  {
    slug: "qwen",
    label: "Qwen",
    apiKeyEnv: "QWEN_API_KEY",
    baseUrlEnv: "QWEN_BASE_URL",
    modelEnv: "QWEN_DEFAULT_MODEL",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  {
    slug: "openrouter",
    label: "OpenRouter",
    apiKeyEnv: "OPENROUTER_API_KEY",
    baseUrlEnv: "OPENROUTER_BASE_URL",
    modelEnv: "OPENROUTER_MODEL",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
  },
];

const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.PROVIDER_SMOKE_TIMEOUT_MS ?? "45000",
  10,
);

type ParsedArgs = {
  providers: string[] | null;
  outPath: string | null;
};

function parseArgs(argv: string[]): ParsedArgs {
  let providers: string[] | null = null;
  let outPath: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--provider" || current === "--providers") {
      providers = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (current === "--out") {
      outPath = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return { providers, outPath };
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildChatCompletionsUrl(baseUrl: string) {
  return new URL("chat/completions", ensureTrailingSlash(baseUrl)).toString();
}

function getConfiguredProviders(selected: string[] | null) {
  return PROVIDERS.filter((provider) => {
    if (selected && !selected.includes(provider.slug)) {
      return false;
    }

    return Boolean(process.env[provider.apiKeyEnv]);
  });
}

async function postChatCompletions(
  provider: ProviderDefinition,
  body: Record<string, unknown>,
) {
  const apiKey = process.env[provider.apiKeyEnv];
  const baseUrl = process.env[provider.baseUrlEnv] || provider.defaultBaseUrl;

  if (!apiKey) {
    throw new Error(`Missing ${provider.apiKeyEnv}`);
  }

  const headers: Record<string, string> = {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
  };

  if (provider.slug === "openrouter") {
    headers["http-referer"] = "https://github.com/Gan-Xing/ai-agent-best-practices";
    headers["x-title"] = "AI Agent Best Practices";
  }

  const startedAt = Date.now();
  const response = await fetch(buildChatCompletionsUrl(baseUrl), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const durationMs = Date.now() - startedAt;
  const text = await response.text();
  let payload: unknown = null;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = { rawText: text };
  }

  if (!response.ok) {
    throw new Error(
      `${provider.slug} ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`,
    );
  }

  return { durationMs, payload };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function getChoiceMessage(payload: unknown) {
  const record = asRecord(payload);
  const choices = Array.isArray(record?.choices) ? record.choices : [];
  const firstChoice = asRecord(choices[0]);

  return asRecord(firstChoice?.message);
}

function getUsage(payload: unknown) {
  return asRecord(payload)?.usage;
}

async function runTextProbe(
  provider: ProviderDefinition,
  model: string,
): Promise<ProbeResult> {
  try {
    const { durationMs, payload } = await postChatCompletions(provider, {
      model,
      temperature: 0,
      messages: [
        {
          role: "user",
          content: "Reply with exactly OK and nothing else.",
        },
      ],
    });
    const message = getChoiceMessage(payload);
    const content = typeof message?.content === "string" ? message.content.trim() : "";
    const ok = content === "OK" || content.includes("OK");

    return {
      status: ok ? "PASS" : "FAIL",
      durationMs,
      note: ok ? `content=${content}` : `unexpected content=${content || "<empty>"}`,
      usage: getUsage(payload),
    };
  } catch (error) {
    return {
      status: "FAIL",
      durationMs: 0,
      note: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runJsonProbe(
  provider: ProviderDefinition,
  model: string,
): Promise<ProbeResult> {
  try {
    const { durationMs, payload } = await postChatCompletions(provider, {
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content:
            'Return valid JSON only: {"provider":"<name>","ok":true,"mode":"json"}',
        },
      ],
    });
    const message = getChoiceMessage(payload);
    const raw = typeof message?.content === "string" ? message.content.trim() : "";
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const ok = parsed.ok === true;

    return {
      status: ok ? "PASS" : "FAIL",
      durationMs,
      note: ok ? `json keys=${Object.keys(parsed).join(",")}` : `json=${raw}`,
      usage: getUsage(payload),
    };
  } catch (error) {
    return {
      status: "FAIL",
      durationMs: 0,
      note: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function runToolProbe(
  provider: ProviderDefinition,
  model: string,
): Promise<ProbeResult> {
  const baseBody = {
    model,
    temperature: 0,
    messages: [
      {
        role: "user",
        content:
          "Call the echo_probe tool exactly once with marker='tool-smoke'. Do not answer normally.",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "echo_probe",
          description: "Returns the marker for provider smoke tests.",
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              marker: { type: "string" },
            },
            required: ["marker"],
          },
        },
      },
    ],
  };

  async function attempt(mode: "forced" | "auto") {
    const body =
      mode === "forced"
        ? {
            ...baseBody,
            tool_choice: {
              type: "function",
              function: { name: "echo_probe" },
            },
          }
        : baseBody;
    const { durationMs, payload } = await postChatCompletions(provider, body);
    const message = getChoiceMessage(payload);
    const toolCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : [];
    const firstToolCall = asRecord(toolCalls[0]);
    const functionBlock = asRecord(firstToolCall?.function);
    const args = typeof functionBlock?.arguments === "string" ? functionBlock.arguments : "";
    const ok = functionBlock?.name === "echo_probe";

    return {
      status: ok ? "PASS" : "FAIL",
      durationMs,
      note: ok
        ? `tool=${functionBlock?.name} args=${args} mode=${mode}`
        : `No valid tool_calls found (mode=${mode})`,
      usage: getUsage(payload),
    } satisfies ProbeResult;
  }

  try {
    const forcedResult = await attempt("forced");

    if (forcedResult.status === "PASS") {
      return forcedResult;
    }

    return await attempt("auto");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    if (/tool_choice/i.test(message)) {
      try {
        return await attempt("auto");
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : "Unknown error";
        const isUnsupported = /tool|function|unsupported|not support/i.test(
          fallbackMessage,
        );

        return {
          status: isUnsupported ? "SKIP" : "FAIL",
          durationMs: 0,
          note: fallbackMessage,
        };
      }
    }

    const isUnsupported = /tool|function|unsupported|not support/i.test(message);

    return {
      status: isUnsupported ? "SKIP" : "FAIL",
      durationMs: 0,
      note: message,
    };
  }
}

async function runProvider(provider: ProviderDefinition): Promise<ProviderResult> {
  const model = process.env[provider.modelEnv] ?? "";
  const baseUrl = process.env[provider.baseUrlEnv] || provider.defaultBaseUrl;

  if (!model) {
    return {
      provider: provider.label,
      model: "",
      baseUrl,
      text: { status: "SKIP", durationMs: 0, note: `Missing ${provider.modelEnv}` },
      json: { status: "SKIP", durationMs: 0, note: `Missing ${provider.modelEnv}` },
      tools: { status: "SKIP", durationMs: 0, note: `Missing ${provider.modelEnv}` },
    };
  }

  return {
    provider: provider.label,
    model,
    baseUrl,
    text: await runTextProbe(provider, model),
    json: await runJsonProbe(provider, model),
    tools: await runToolProbe(provider, model),
  };
}

function printSummary(results: ProviderResult[]) {
  const rows = results.map((result) => ({
    provider: result.provider,
    model: result.model,
    text: `${result.text.status} (${result.text.durationMs}ms)`,
    json: `${result.json.status} (${result.json.durationMs}ms)`,
    tools: `${result.tools.status} (${result.tools.durationMs}ms)`,
  }));

  console.table(rows);

  for (const result of results) {
    console.log(`\n## ${result.provider} / ${result.model}`);
    console.log(`- baseUrl: ${result.baseUrl}`);
    console.log(`- text: ${result.text.note}`);
    console.log(`- json: ${result.json.note}`);
    console.log(`- tools: ${result.tools.note}`);
  }
}

async function maybeWriteReport(results: ProviderResult[], outPath: string | null) {
  if (!outPath) {
    return;
  }

  const absolutePath = path.isAbsolute(outPath)
    ? outPath
    : path.join(process.cwd(), outPath);

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(
    absolutePath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`\nReport written to ${absolutePath}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = getConfiguredProviders(args.providers);

  if (!providers.length) {
    console.error(
      "No configured providers found. Set provider API keys in .env or pass --provider with a configured provider slug.",
    );
    process.exitCode = 1;
    return;
  }

  const results = await Promise.all(providers.map((provider) => runProvider(provider)));
  printSummary(results);
  await maybeWriteReport(results, args.outPath);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
