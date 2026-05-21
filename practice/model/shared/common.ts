import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: process.env.MODEL_CAPABILITY_ENV_FILE ?? ".env" });

export type ProbeStatus = "PASS" | "FAIL" | "SKIP";

export type ProbeResult = {
  status: ProbeStatus;
  durationMs: number;
  note: string;
  metadata?: Record<string, unknown>;
};

export type ParsedArgs = {
  outPath: string | null;
};

export function parseCommonArgs(argv: string[]): ParsedArgs {
  let outPath: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--out") {
      outPath = argv[index + 1] ?? null;
      index += 1;
    }
  }

  return { outPath };
}

export function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export function formatError(status: number, payload: unknown) {
  return `${status}: ${JSON.stringify(payload).slice(0, 800)}`;
}

export async function requestJson(
  url: string,
  options: {
    method?: "GET" | "POST";
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
    timeoutMs?: number;
  },
) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: options.method ?? "POST",
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
  });
  const durationMs = Date.now() - startedAt;
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = { rawText: text };
  }

  return {
    ok: response.ok,
    status: response.status,
    durationMs,
    payload,
    headers: response.headers,
  };
}

export async function writeReport(outPath: string, data: unknown) {
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, JSON.stringify(data, null, 2), "utf8");
}
