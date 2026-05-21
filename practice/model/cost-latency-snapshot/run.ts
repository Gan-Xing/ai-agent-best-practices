import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

type SmokeResult = {
  preset: string;
  provider: string;
  model: string;
  costLatencySnapshot?: {
    measuredProbeCount: number;
    totalDurationMs: number;
    averageLatencyMs: number;
    slowestProbe: string;
    slowestProbeDurationMs: number;
    totalCostUsd: number | null;
    probesWithCost: number;
    outputTokensPerSecond: number | null;
  };
  usageSummary?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    measuredProbeCount: number;
    totalDurationMs: number;
  };
  [key: string]: unknown;
};

type ReportFile = {
  generatedAt: string;
  results: SmokeResult[];
};

function parseArgs(argv: string[]) {
  let reportArg: string | null = null;
  let keepAll = false;

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--report") {
      reportArg = argv[index + 1] ?? null;
      index += 1;
    }

    if (argv[index] === "--all") {
      keepAll = true;
    }
  }

  return {
    reports: reportArg
      ? reportArg.split(",").map((item) => item.trim()).filter(Boolean)
      : null,
    keepAll,
  };
}

async function findDefaultReports() {
  const dir = path.join(
    process.cwd(),
    "runtime/practice/model/capability-smoke",
  );
  const entries = await readdir(dir);
  return entries
    .filter((name) => name.endsWith(".json"))
    .map((name) => path.join(dir, name))
    .sort();
}

async function loadReports(paths: string[]) {
  const rows: Array<Record<string, unknown>> = [];

  for (const filePath of paths) {
    const text = await readFile(filePath, "utf8");
    const report = JSON.parse(text) as ReportFile;

    for (const result of report.results) {
      const snapshot = result.costLatencySnapshot;
      const usageSummary = result.usageSummary;

      if (!snapshot) {
        continue;
      }

      rows.push({
        model: result.model,
        preset: result.preset,
        provider: result.provider,
        reportPath: filePath,
        generatedAt: report.generatedAt,
        totalTokens: usageSummary?.totalTokens ?? null,
        outputTokens: usageSummary?.outputTokens ?? null,
        totalDurationMs: snapshot?.totalDurationMs ?? usageSummary?.totalDurationMs ?? null,
        averageLatencyMs: snapshot?.averageLatencyMs ?? null,
        slowestProbe: snapshot?.slowestProbe ?? null,
        slowestProbeDurationMs: snapshot?.slowestProbeDurationMs ?? null,
        totalCostUsd: snapshot?.totalCostUsd ?? null,
        probesWithCost: snapshot?.probesWithCost ?? 0,
        outputTokensPerSecond: snapshot?.outputTokensPerSecond ?? null,
      });
    }
  }

  return rows;
}

function formatMarkdown(rows: Array<Record<string, unknown>>) {
  const header =
    "| model | provider | total tokens | total duration ms | avg latency ms | slowest probe | slowest probe ms | total cost usd | output tok/s |\n" +
    "|---|---|---:|---:|---:|---|---:|---:|---:|";
  const lines = rows.map((row) =>
    [
      row.model,
      row.provider,
      row.totalTokens ?? "n/a",
      row.totalDurationMs ?? "n/a",
      typeof row.averageLatencyMs === "number"
        ? row.averageLatencyMs.toFixed(1)
        : "n/a",
      row.slowestProbe ?? "n/a",
      row.slowestProbeDurationMs ?? "n/a",
      typeof row.totalCostUsd === "number"
        ? row.totalCostUsd.toFixed(6)
        : "n/a",
      typeof row.outputTokensPerSecond === "number"
        ? row.outputTokensPerSecond.toFixed(2)
        : "n/a",
    ].join(" | "),
  );

  return [header, ...lines.map((line) => `| ${line} |`)].join("\n");
}

function dedupeLatestPerModel(rows: Array<Record<string, unknown>>) {
  const map = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const model = String(row.model);
    const current = map.get(model);

    if (!current) {
      map.set(model, row);
      continue;
    }

    const currentTime = Date.parse(String(current.generatedAt ?? ""));
    const nextTime = Date.parse(String(row.generatedAt ?? ""));

    if (nextTime >= currentTime) {
      map.set(model, row);
    }
  }

  return Array.from(map.values()).sort((left, right) =>
    String(left.model).localeCompare(String(right.model)),
  );
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const reportPaths = args.reports ?? (await findDefaultReports());

  if (!reportPaths.length) {
    throw new Error("No capability-smoke JSON reports found.");
  }

  const rows = await loadReports(reportPaths);
  const finalRows = args.keepAll ? rows : dedupeLatestPerModel(rows);
  const outputDir = path.join(
    process.cwd(),
    "runtime/practice/model/cost-latency-snapshot",
  );
  await mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, "snapshot.json");
  const mdPath = path.join(outputDir, "snapshot.md");

  await writeFile(jsonPath, JSON.stringify(finalRows, null, 2), "utf8");
  await writeFile(mdPath, formatMarkdown(finalRows), "utf8");

  console.table(
    finalRows.map((row) => ({
      model: row.model,
      avgLatencyMs: row.averageLatencyMs,
      totalCostUsd: row.totalCostUsd,
      outputTokensPerSecond: row.outputTokensPerSecond,
      slowestProbe: row.slowestProbe,
    })),
  );
  console.log(`saved=${jsonPath}`);
  console.log(`saved=${mdPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
