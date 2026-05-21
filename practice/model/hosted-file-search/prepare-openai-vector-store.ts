import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

dotenv.config({ path: process.env.MODEL_CAPABILITY_ENV_FILE ?? ".env" });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
const FIXTURE_PATH = path.join(
  process.cwd(),
  "practice/model/hosted-file-search/fixture/gpt-5.5-knowledge-base.md",
);
const OUTPUT_DIR = path.join(
  process.cwd(),
  "runtime/practice/model/hosted-file-search",
);

function ensureTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    payload = { rawText: text };
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${JSON.stringify(payload).slice(0, 500)}`);
  }

  return payload as Record<string, unknown>;
}

async function uploadFile(contents: string) {
  const form = new FormData();
  const blob = new Blob([contents], { type: "text/markdown" });
  form.set("purpose", "assistants");
  form.set("file", blob, "gpt-5.5-knowledge-base.md");

  const payload = await requestJson(
    new URL("files", ensureTrailingSlash(OPENAI_BASE_URL)).toString(),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: form,
    },
  );

  return String(payload.id);
}

async function createVectorStore() {
  const payload = await requestJson(
    new URL("vector_stores", ensureTrailingSlash(OPENAI_BASE_URL)).toString(),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "ai-agent-best-practice-gpt-5.5-file-search",
      }),
    },
  );

  return String(payload.id);
}

async function attachFile(vectorStoreId: string, fileId: string) {
  const payload = await requestJson(
    new URL(
      `vector_stores/${vectorStoreId}/files`,
      ensureTrailingSlash(OPENAI_BASE_URL),
    ).toString(),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        file_id: fileId,
      }),
    },
  );

  return String(payload.id);
}

async function pollVectorStoreFile(
  vectorStoreId: string,
  vectorStoreFileId: string,
  maxAttempts = 30,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const payload = await requestJson(
      new URL(
        `vector_stores/${vectorStoreId}/files/${vectorStoreFileId}`,
        ensureTrailingSlash(OPENAI_BASE_URL),
      ).toString(),
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      },
    );

    const status = String(payload.status ?? "");

    if (status === "completed") {
      return payload;
    }

    if (status === "failed" || status === "cancelled") {
      throw new Error(`Vector store file indexing ended with status=${status}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timed out waiting for vector store indexing");
}

async function main() {
  if (!OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY in .env");
  }

  const fixture = await readFile(FIXTURE_PATH, "utf8");
  const fileId = await uploadFile(fixture);
  const vectorStoreId = await createVectorStore();
  const vectorStoreFileId = await attachFile(vectorStoreId, fileId);
  const finalStatus = await pollVectorStoreFile(vectorStoreId, vectorStoreFileId);

  await mkdir(OUTPUT_DIR, { recursive: true });
  const outputPath = path.join(OUTPUT_DIR, "openai-vector-store.json");

  await writeFile(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        openaiBaseUrl: OPENAI_BASE_URL,
        fixturePath: FIXTURE_PATH,
        fileId,
        vectorStoreId,
        vectorStoreFileId,
        finalStatus,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`fileId=${fileId}`);
  console.log(`vectorStoreId=${vectorStoreId}`);
  console.log(`vectorStoreFileId=${vectorStoreFileId}`);
  console.log(`saved=${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
