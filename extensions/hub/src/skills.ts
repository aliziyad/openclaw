import path from "node:path";
import fs from "node:fs";
import type { HubDb } from "./db.js";

export type Skill = {
  id: string;
  name: string;
  description: string;
  content: string;
  source: "auto" | "manual" | "imported";
  tags: string[];
  useCount: number;
  successCount: number;
  lastUsedAt?: number;
  createdAt: number;
};

export type ToolCallRecord = {
  agentId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  durationMs: number;
  success: boolean;
};

// Convert a tool call into a reusable skill (Hermes-style auto-generation)
export function generateSkillFromToolCall(record: ToolCallRecord): Omit<Skill, "id"> | null {
  // Only generate skills for successful, non-trivial calls
  if (!record.success || record.durationMs < 200) {
    return null;
  }

  const name = `${record.toolName}_skill_${Date.now()}`;
  const tags = [record.toolName, "auto-generated", record.agentId];

  const content = [
    `# Skill: ${record.toolName}`,
    "",
    "## When to use",
    `Use this skill when you need to run \`${record.toolName}\`.`,
    "",
    "## Example call",
    "```json",
    JSON.stringify(record.input, null, 2),
    "```",
    "",
    "## Expected output pattern",
    "```",
    record.output.slice(0, 500),
    "```",
    "",
    "## Notes",
    `- Observed duration: ~${record.durationMs}ms`,
    `- Generated: ${new Date().toISOString()}`,
  ].join("\n");

  return {
    name,
    description: `Auto-generated skill for ${record.toolName} tool invocations`,
    content,
    source: "auto",
    tags,
    useCount: 1,
    successCount: 1,
    lastUsedAt: Math.floor(Date.now() / 1000),
    createdAt: Math.floor(Date.now() / 1000),
  };
}

export function saveSkill(db: HubDb, skill: Omit<Skill, "id">): string {
  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO skills (id, name, description, content, source, tags, use_count, success_count, last_used_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    skill.name,
    skill.description,
    skill.content,
    skill.source,
    JSON.stringify(skill.tags),
    skill.useCount,
    skill.successCount,
    skill.lastUsedAt ?? null,
  );
  return id;
}

export function listSkills(db: HubDb, opts?: { source?: string; limit?: number }): Skill[] {
  let query = `SELECT * FROM skills`;
  const params: unknown[] = [];
  if (opts?.source) {
    query += ` WHERE source = ?`;
    params.push(opts.source);
  }
  query += ` ORDER BY use_count DESC, created_at DESC`;
  if (opts?.limit) {
    query += ` LIMIT ?`;
    params.push(opts.limit);
  }
  return (db.prepare(query).all(...params) as Record<string, unknown>[]).map(rowToSkill);
}

export function getSkill(db: HubDb, id: string): Skill | undefined {
  const row = db.prepare(`SELECT * FROM skills WHERE id = ?`).get(id);
  return row ? rowToSkill(row as Record<string, unknown>) : undefined;
}

export function recordSkillUsage(db: HubDb, id: string, success: boolean): void {
  db.prepare(`
    UPDATE skills SET
      use_count = use_count + 1,
      success_count = success_count + CASE WHEN ? THEN 1 ELSE 0 END,
      last_used_at = unixepoch()
    WHERE id = ?
  `).run(success ? 1 : 0, id);
}

// Export skills to portable Markdown files (agentskills.io compatible)
export function exportSkillsToDir(db: HubDb, dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
  const skills = listSkills(db);
  for (const s of skills) {
    const filename = `${s.name.replace(/[^a-z0-9_-]/gi, "_")}.md`;
    fs.writeFileSync(path.join(dir, filename), s.content, "utf8");
  }
}

// Import skills from a directory of Markdown files
export function importSkillsFromDir(db: HubDb, dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(path.join(dir, file), "utf8");
    const name = file.replace(/\.md$/, "");
    const firstLine = content.split("\n").find((l) => l.startsWith("# ")) ?? "";
    const description = firstLine.replace(/^# Skill: /, "") || name;
    saveSkill(db, {
      name,
      description,
      content,
      source: "imported",
      tags: ["imported"],
      useCount: 0,
      successCount: 0,
      createdAt: Math.floor(Date.now() / 1000),
    });
    count++;
  }
  return count;
}

function rowToSkill(row: Record<string, unknown>): Skill {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string,
    content: row.content as string,
    source: row.source as Skill["source"],
    tags: JSON.parse((row.tags as string) || "[]"),
    useCount: row.use_count as number,
    successCount: row.success_count as number,
    lastUsedAt: (row.last_used_at as number) ?? undefined,
    createdAt: row.created_at as number,
  };
}
