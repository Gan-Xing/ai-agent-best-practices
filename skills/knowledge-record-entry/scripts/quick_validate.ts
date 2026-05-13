import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const SKILL_DIR = path.join(process.cwd(), "skills", "knowledge-record-entry");

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function run(command: string, args: string[]) {
  execFileSync(command, args, {
    cwd: process.cwd(),
    stdio: "pipe",
    encoding: "utf8",
  });
}

function validateSkillMarkdown() {
  const skillPath = path.join(SKILL_DIR, "SKILL.md");
  const content = readFileSync(skillPath, "utf8");
  const frontmatter = /^---\n([\s\S]*?)\n---/.exec(content)?.[1] ?? "";

  assert(frontmatter.includes("name: knowledge-record-entry"), "missing skill name");
  assert(frontmatter.includes("description:"), "missing skill description");
  assert(
    content.includes("Never write JSON or sync the server before the user confirms"),
    "missing confirmation safety rule",
  );
  assert(
    content.includes("scripts/apply-draft.ts"),
    "missing apply-draft script reference",
  );
}

function validateOpenAiYaml() {
  const yamlPath = path.join(SKILL_DIR, "agents", "openai.yaml");
  const content = readFileSync(yamlPath, "utf8");

  assert(content.includes("display_name:"), "missing display_name");
  assert(content.includes("short_description:"), "missing short_description");
  assert(
    content.includes("$knowledge-record-entry"),
    "default_prompt must mention $knowledge-record-entry",
  );
}

function main() {
  const requiredFiles = [
    "SKILL.md",
    "agents/openai.yaml",
    "references/record-entry-rules.md",
    "scripts/apply-draft.ts",
    "scripts/quick_validate.ts",
  ];

  for (const file of requiredFiles) {
    assert(existsSync(path.join(SKILL_DIR, file)), `missing ${file}`);
  }

  validateSkillMarkdown();
  validateOpenAiYaml();
  run("pnpm", ["content:fields"]);
  run("pnpm", [
    "tsx",
    "skills/knowledge-record-entry/scripts/apply-draft.ts",
    "--help",
  ]);

  console.log(
    JSON.stringify(
      {
        ok: true,
        skill: "knowledge-record-entry",
        checks: [
          "required-files",
          "skill-frontmatter",
          "openai-yaml",
          "content-fields",
          "apply-draft-help",
        ],
      },
      null,
      2,
    ),
  );
}

try {
  main();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
