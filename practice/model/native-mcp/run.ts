import dotenv from "dotenv";

import {
  getConfiguredPresets,
  type ModelCapabilityPreset,
} from "../capability-smoke/models";

dotenv.config({ path: process.env.MODEL_CAPABILITY_ENV_FILE ?? ".env" });

const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.MODEL_CAPABILITY_NATIVE_MCP_TIMEOUT_MS ??
    process.env.MODEL_CAPABILITY_TIMEOUT_MS ??
    "90000",
  10,
);
const MCP_SERVER_URL =
  process.env.MODEL_CAPABILITY_MCP_SERVER_URL ??
  "https://dmcp-server.deno.dev/sse";

function parseArgs(argv: string[]) {
  let models: string[] | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--model" || argv[index] === "--models") {
      models = (argv[index + 1] ?? "")
        .split(",")
        .map((value) => value.trim().toLowerCase())
        .filter(Boolean);
      index += 1;
    }
  }

  return { models };
}

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

function buildResponsesUrl(baseUrl: string) {
  return new URL("responses", ensureTrailingSlash(baseUrl)).toString();
}

function createHeaders(preset: ModelCapabilityPreset) {
  const apiKey = process.env[preset.apiKeyEnv];

  if (!apiKey) {
    throw new Error(`Missing ${preset.apiKeyEnv}`);
  }

  return {
    "content-type": "application/json",
    authorization: `Bearer ${apiKey}`,
    ...(preset.headers ?? {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function getResponseText(payload: unknown) {
  const record = asRecord(payload);

  if (typeof record?.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const output = Array.isArray(record?.output) ? record.output : [];
  const parts: string[] = [];

  for (const item of output) {
    const itemRecord = asRecord(item);
    const content = Array.isArray(itemRecord?.content) ? itemRecord.content : [];

    for (const part of content) {
      const partRecord = asRecord(part);
      if (
        partRecord?.type === "output_text" &&
        typeof partRecord.text === "string"
      ) {
        parts.push(partRecord.text);
      }
    }
  }

  return parts.join("").trim();
}

async function runProbe(preset: ModelCapabilityPreset) {
  const baseUrl = process.env[preset.baseUrlEnv] || preset.defaultBaseUrl;

  if (preset.transport !== "responses") {
    return {
      model: preset.modelId,
      status: "SKIP",
      note: "This practice currently targets Responses-compatible transports only.",
    };
  }

  const startedAt = Date.now();
  const response = await fetch(buildResponsesUrl(baseUrl), {
    method: "POST",
    headers: createHeaders(preset),
    body: JSON.stringify({
      model: preset.modelId,
      input: "Use the MCP server to roll 2d4+1, then reply with the total only.",
      tools: [
        {
          type: "mcp",
          server_label: "demo",
          server_url: MCP_SERVER_URL,
          require_approval: "never",
        },
      ],
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const durationMs = Date.now() - startedAt;
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = { rawText: text };
  }

  if (!response.ok) {
    return {
      model: preset.modelId,
      status: "FAIL",
      durationMs,
      note: `${response.status} ${JSON.stringify(payload).slice(0, 300)}`,
    };
  }

  const output = Array.isArray(asRecord(payload)?.output)
    ? (asRecord(payload)?.output as unknown[])
    : [];
  const mcpCalls = output
    .map((item) => asRecord(item))
    .filter((item) => item?.type === "mcp_call").length;
  const finalText = getResponseText(payload);
  const numeric = /\b\d+\b/.test(finalText);

  return {
    model: preset.modelId,
    status: numeric && mcpCalls > 0 ? "PASS" : "FAIL",
    durationMs,
    note: `text=${finalText.slice(0, 120)} mcpCalls=${mcpCalls}`,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const presets = getConfiguredPresets(args.models).filter(
    (preset) => preset.transport === "responses",
  );

  if (!presets.length) {
    throw new Error("No configured Responses-compatible presets found.");
  }

  const results = await Promise.all(presets.map((preset) => runProbe(preset)));
  console.table(results);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
