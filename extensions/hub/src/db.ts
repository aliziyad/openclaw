import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

// Use synchronous require for better-sqlite3 (native module)
const _require = createRequire(import.meta.url);

export type HubDb = ReturnType<typeof openDb>;

export function openDb(stateDir: string) {
  fs.mkdirSync(stateDir, { recursive: true });
  const dbPath = path.join(stateDir, "hub.db");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = _require("better-sqlite3");
  const db = new Database(dbPath) as import("better-sqlite3").Database;

  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    -- Businesses (the 3 orgs from the blueprint)
    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      platforms TEXT NOT NULL DEFAULT '["twitter","instagram","facebook","youtube","tiktok"]',
      topics TEXT NOT NULL DEFAULT '[]',
      image_prompts TEXT NOT NULL DEFAULT '[]',
      video_templates TEXT NOT NULL DEFAULT '[]',
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Agents registered with the Hub (OpenClaw + Hermes instances)
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'openclaw',
      endpoint TEXT,
      model TEXT,
      monthly_budget_usd REAL NOT NULL DEFAULT 20.0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Budget ledger: every API call cost
    CREATE TABLE IF NOT EXISTS budget_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      business_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL NOT NULL DEFAULT 0,
      month TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE INDEX IF NOT EXISTS idx_budget_agent_month ON budget_entries(agent_id, month);
    CREATE INDEX IF NOT EXISTS idx_budget_business ON budget_entries(business_id, month);

    -- Self-improving skills (Hermes-style)
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      content TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'auto',
      tags TEXT NOT NULL DEFAULT '[]',
      use_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      last_used_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- User model: extracted preferences and facts
    CREATE TABLE IF NOT EXISTS user_model (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      confidence REAL NOT NULL DEFAULT 0.8,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(agent_id, kind, key)
    );

    -- MCP servers
    CREATE TABLE IF NOT EXISTS mcp_servers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      transport TEXT NOT NULL DEFAULT 'stdio',
      command TEXT,
      url TEXT,
      headers TEXT NOT NULL DEFAULT '{}',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Social media post log
    CREATE TABLE IF NOT EXISTS social_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      business_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      media_urls TEXT NOT NULL DEFAULT '[]',
      scheduled_at INTEGER,
      posted_at INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      postiz_id TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Onboarding state
    CREATE TABLE IF NOT EXISTS onboarding (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    -- Governance: approval gate log
    CREATE TABLE IF NOT EXISTS approval_gates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'pending',
      requested_by TEXT,
      resolved_by TEXT,
      resolved_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  return db;
}
