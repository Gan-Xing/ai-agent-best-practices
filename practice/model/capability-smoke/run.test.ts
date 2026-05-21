import assert from "node:assert/strict";
import test from "node:test";

import { getConfiguredPresets } from "./models";
import {
  buildChatCompletionsUrl,
  buildResponsesUrl,
  ensureTrailingSlash,
  parseArgs,
} from "./run";

test("parseArgs reads model and out options", () => {
  const parsed = parseArgs([
    "--model",
    "deepseek-v4-pro,qwen3.6-plus",
    "--out",
    "runtime/practice/model/capability-smoke/qwen.json",
  ]);

  assert.deepEqual(parsed.models, ["deepseek-v4-pro", "qwen3.6-plus"]);
  assert.equal(
    parsed.outPath,
    "runtime/practice/model/capability-smoke/qwen.json",
  );
});

test("parseArgs keeps target aliases for compatibility", () => {
  const parsed = parseArgs(["--target", "gpt-5.5"]);

  assert.deepEqual(parsed.models, ["gpt-5.5"]);
});

test("ensureTrailingSlash appends only when needed", () => {
  assert.equal(ensureTrailingSlash("https://example.com/v1"), "https://example.com/v1/");
  assert.equal(ensureTrailingSlash("https://example.com/v1/"), "https://example.com/v1/");
});

test("buildChatCompletionsUrl builds the canonical endpoint", () => {
  assert.equal(
    buildChatCompletionsUrl("https://api.deepseek.com"),
    "https://api.deepseek.com/chat/completions",
  );
});

test("buildResponsesUrl builds the canonical endpoint", () => {
  assert.equal(
    buildResponsesUrl("https://openrouter.ai/api/v1"),
    "https://openrouter.ai/api/v1/responses",
  );
});

test("getConfiguredPresets filters by env and selected keys", () => {
  const env = {
    DEEPSEEK_API_KEY: "x",
    QWEN_API_KEY: "y",
    OPENROUTER_API_KEY: "z",
    MOONSHOT_API_KEY: "m",
  } as NodeJS.ProcessEnv;

  const allConfigured = getConfiguredPresets(null, env);
  const selected = getConfiguredPresets(["gpt-5.5", "kimi-k2.6"], env);

  assert.deepEqual(
    allConfigured.map((preset) => preset.key),
    [
      "deepseek-v4-pro",
      "qwen3.6-plus",
      "gpt-5.5",
      "claude-opus-4.7",
      "gemini-3.1-pro-preview",
      "kimi-k2.6",
    ],
  );
  assert.deepEqual(
    selected.map((preset) => preset.key),
    ["gpt-5.5", "kimi-k2.6"],
  );
  assert.equal(
    allConfigured.find((preset) => preset.key === "deepseek-v4-pro")?.transport,
    "chat_completions",
  );
  assert.equal(
    allConfigured.find((preset) => preset.key === "gpt-5.5")?.transport,
    "responses",
  );
  assert.equal(
    allConfigured.find((preset) => preset.key === "kimi-k2.6")?.transport,
    "chat_completions",
  );
});
