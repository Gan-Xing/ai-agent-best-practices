import { readFileSync } from "node:fs";
import path from "node:path";

type JsonObject = Record<string, unknown>;

function readJson(filePath: string): JsonObject {
  return JSON.parse(readFileSync(filePath, "utf8")) as JsonObject;
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }

  return Object.entries(value as JsonObject).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const messagesDir = path.join(process.cwd(), "messages");
const zhKeys = new Set(flattenKeys(readJson(path.join(messagesDir, "zh.json"))));
const enKeys = new Set(flattenKeys(readJson(path.join(messagesDir, "en.json"))));

const missingInEn = [...zhKeys].filter((key) => !enKeys.has(key));
const missingInZh = [...enKeys].filter((key) => !zhKeys.has(key));

if (missingInEn.length || missingInZh.length) {
  console.error("i18n message keys are out of sync.");

  if (missingInEn.length) {
    console.error("\nMissing in en.json:");
    for (const key of missingInEn) {
      console.error(`- ${key}`);
    }
  }

  if (missingInZh.length) {
    console.error("\nMissing in zh.json:");
    for (const key of missingInZh) {
      console.error(`- ${key}`);
    }
  }

  process.exit(1);
}

console.log(`i18n message keys are in sync (${zhKeys.size} keys).`);
