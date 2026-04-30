import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { HubDb } from "./db.js";
import {
  getBudgetSummary,
  getMonthlySpend,
  getMonthlyBudget,
  getDailySpendByBusiness,
  recordCost,
  currentMonth,
} from "./budget.js";
import {
  listSkills,
  getSkill,
  saveSkill,
  recordSkillUsage,
  exportSkillsToDir,
} from "./skills.js";
import { getUserModel } from "./user-model.js";
import { loadMcpServers, saveMcpServer, listMcpTools } from "./mcp.js";
import { getOnboardingState, setOnboardingKey, advanceOnboardingStep, completeOnboarding, ONBOARDING_STEPS } from "./onboarding.js";
import { runDailyWorkflow, getBusinessFromDb } from "./social/index.js";
import type { SocialRunConfig } from "./social/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DASHBOARD_DIR = path.resolve(__dirname, "../dashboard/dist");

type RouteHandler = (req: http.IncomingMessage, res: http.ServerResponse, params: Record<string, string>) => Promise<void>;

function json(res: http.ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function serveStatic(res: http.ServerResponse, filePath: string): void {
  if (!fs.existsSync(filePath)) {
    // SPA fallback: serve index.html for unknown routes
    const index = path.join(DASHBOARD_DIR, "index.html");
    if (fs.existsSync(index)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      fs.createReadStream(index).pipe(res);
    } else {
      res.writeHead(404);
      res.end("Dashboard not built. Run: pnpm dashboard:build");
    }
    return;
  }
  const ext = path.extname(filePath);
  const mime: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
  };
  res.writeHead(200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

export function createHubServer(db: HubDb, port = 3001): http.Server {
  const routes: Array<{ method: string; pattern: RegExp; keys: string[]; handler: RouteHandler }> = [];

  function route(method: string, path: string, handler: RouteHandler) {
    const keys: string[] = [];
    const pattern = new RegExp(
      "^" + path.replace(/:([^/]+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "$",
    );
    routes.push({ method, pattern, keys, handler });
  }

  // ── Onboarding ──────────────────────────────────────────────────────────────
  route("GET", "/api/onboarding", async (_, res) => {
    json(res, { state: getOnboardingState(db), steps: ONBOARDING_STEPS });
  });

  route("POST", "/api/onboarding/advance", async (req, res) => {
    const body = (await readBody(req)) as { step?: string; key?: string; value?: string };
    if (body.step) advanceOnboardingStep(db, body.step);
    if (body.key && body.value !== undefined) setOnboardingKey(db, body.key, body.value);
    json(res, { ok: true, state: getOnboardingState(db) });
  });

  route("POST", "/api/onboarding/complete", async (_, res) => {
    completeOnboarding(db);
    json(res, { ok: true });
  });

  // ── System overview ──────────────────────────────────────────────────────────
  route("GET", "/api/overview", async (_, res) => {
    const agents = db.prepare("SELECT * FROM agents").all() as Array<{
      id: string; name: string; kind: string; model: string; active: number;
    }>;
    const businesses = db.prepare("SELECT id, name, active FROM businesses").all();
    const budget = getBudgetSummary(db);
    const skillsCount = (db.prepare("SELECT COUNT(*) as c FROM skills").get() as { c: number }).c;
    const postsToday = (
      db.prepare(
        "SELECT COUNT(*) as c FROM social_posts WHERE created_at > unixepoch() - 86400",
      ).get() as { c: number }
    ).c;
    json(res, { agents, businesses, budget, skillsCount, postsToday });
  });

  // ── Agents ──────────────────────────────────────────────────────────────────
  route("GET", "/api/agents", async (_, res) => {
    const agents = db.prepare("SELECT * FROM agents").all();
    json(res, agents);
  });

  route("POST", "/api/agents", async (req, res) => {
    const body = (await readBody(req)) as {
      id?: string; name?: string; kind?: string; model?: string; endpoint?: string; monthlyBudgetUsd?: number;
    };
    const id = body.id ?? crypto.randomUUID();
    db.prepare(`
      INSERT INTO agents (id, name, kind, model, endpoint, monthly_budget_usd)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        kind = excluded.kind,
        model = excluded.model,
        endpoint = excluded.endpoint,
        monthly_budget_usd = excluded.monthly_budget_usd
    `).run(id, body.name ?? id, body.kind ?? "openclaw", body.model ?? null, body.endpoint ?? null, body.monthlyBudgetUsd ?? 20);
    json(res, { id });
  });

  // ── Budgets ──────────────────────────────────────────────────────────────────
  route("GET", "/api/budget", async (_, res) => {
    json(res, getBudgetSummary(db));
  });

  route("GET", "/api/budget/:agentId", async (_, res, p) => {
    const month = currentMonth();
    json(res, {
      agentId: p.agentId,
      month,
      spent: getMonthlySpend(db, p.agentId),
      budget: getMonthlyBudget(db, p.agentId),
    });
  });

  route("POST", "/api/budget/record", async (req, res) => {
    const body = (await readBody(req)) as Parameters<typeof recordCost>[1];
    recordCost(db, body);
    json(res, { ok: true });
  });

  // ── Businesses ──────────────────────────────────────────────────────────────
  route("GET", "/api/businesses", async (_, res) => {
    const rows = db.prepare("SELECT * FROM businesses").all() as Record<string, unknown>[];
    json(res, rows.map((r) => ({
      id: r.id, name: r.name, description: r.description,
      platforms: JSON.parse(r.platforms as string),
      topics: JSON.parse(r.topics as string),
      imagePrompts: JSON.parse(r.image_prompts as string),
      videoTemplates: JSON.parse(r.video_templates as string),
      active: r.active,
    })));
  });

  route("POST", "/api/businesses", async (req, res) => {
    const body = (await readBody(req)) as {
      id?: string; name?: string; description?: string; platforms?: string[];
      topics?: string[]; imagePrompts?: string[]; videoTemplates?: unknown[];
    };
    const id = body.id ?? crypto.randomUUID();
    db.prepare(`
      INSERT INTO businesses (id, name, description, platforms, topics, image_prompts, video_templates)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name, description = excluded.description,
        platforms = excluded.platforms, topics = excluded.topics,
        image_prompts = excluded.image_prompts, video_templates = excluded.video_templates
    `).run(
      id, body.name ?? id, body.description ?? null,
      JSON.stringify(body.platforms ?? ["twitter", "instagram", "facebook"]),
      JSON.stringify(body.topics ?? []),
      JSON.stringify(body.imagePrompts ?? []),
      JSON.stringify(body.videoTemplates ?? []),
    );
    setOnboardingKey(db, "businesses_added", "true");
    json(res, { id });
  });

  route("GET", "/api/businesses/:id/spend", async (_, res, p) => {
    json(res, { data: getDailySpendByBusiness(db, p.id) });
  });

  // ── Social media ─────────────────────────────────────────────────────────────
  route("GET", "/api/social/posts", async (_, res) => {
    const rows = db.prepare(`
      SELECT sp.*, b.name as business_name
      FROM social_posts sp
      LEFT JOIN businesses b ON b.id = sp.business_id
      ORDER BY sp.created_at DESC LIMIT 100
    `).all();
    json(res, rows);
  });

  route("POST", "/api/social/run/:businessId", async (req, res, p) => {
    const biz = getBusinessFromDb(db, p.businessId);
    if (!biz) { json(res, { error: "Business not found" }, 404); return; }

    const cfg = (await readBody(req)) as Partial<SocialRunConfig>;
    const apiKeys = db.prepare("SELECT key, value FROM onboarding WHERE key LIKE 'apikey_%'").all() as Array<{key: string; value: string}>;
    const keys: Record<string, string> = {};
    for (const k of apiKeys) keys[k.key.replace("apikey_", "")] = k.value;

    const runConfig: SocialRunConfig = {
      togetherApiKey: cfg.togetherApiKey ?? keys["together"] ?? "",
      novitaApiKey: cfg.novitaApiKey ?? keys["novita"] ?? "",
      shotstackApiKey: cfg.shotstackApiKey ?? keys["shotstack"] ?? "",
      postizBaseUrl: cfg.postizBaseUrl ?? keys["postiz_url"] ?? "http://localhost:3000",
      postizApiKey: cfg.postizApiKey ?? keys["postiz"],
    };

    // Run async, return immediately with job id
    const jobId = crypto.randomUUID();
    setImmediate(async () => {
      try {
        await runDailyWorkflow(biz, runConfig, db);
      } catch {}
    });
    json(res, { jobId, status: "started" });
  });

  // ── Skills ───────────────────────────────────────────────────────────────────
  route("GET", "/api/skills", async (_, res) => {
    json(res, listSkills(db, { limit: 100 }));
  });

  route("GET", "/api/skills/:id", async (_, res, p) => {
    const skill = getSkill(db, p.id);
    if (!skill) { json(res, { error: "Not found" }, 404); return; }
    json(res, skill);
  });

  route("POST", "/api/skills", async (req, res) => {
    const body = (await readBody(req)) as Parameters<typeof saveSkill>[1];
    const id = saveSkill(db, body);
    json(res, { id });
  });

  route("POST", "/api/skills/:id/use", async (req, res, p) => {
    const body = (await readBody(req)) as { success?: boolean };
    recordSkillUsage(db, p.id, body.success !== false);
    json(res, { ok: true });
  });

  route("POST", "/api/skills/export", async (req, res) => {
    const body = (await readBody(req)) as { dir?: string };
    const dir = body.dir ?? path.join(process.env.HOME ?? "/tmp", ".openclaw", "hub-skills");
    exportSkillsToDir(db, dir);
    json(res, { ok: true, dir });
  });

  // ── User model ───────────────────────────────────────────────────────────────
  route("GET", "/api/user-model/:agentId", async (_, res, p) => {
    json(res, getUserModel(db, p.agentId));
  });

  // ── MCP ──────────────────────────────────────────────────────────────────────
  route("GET", "/api/mcp/servers", async (_, res) => {
    json(res, loadMcpServers(db));
  });

  route("POST", "/api/mcp/servers", async (req, res) => {
    const body = (await readBody(req)) as Parameters<typeof saveMcpServer>[1];
    const id = saveMcpServer(db, body);
    json(res, { id });
  });

  route("GET", "/api/mcp/tools", async (_, res) => {
    json(res, listMcpTools().map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })));
  });

  // ── Settings / API keys ───────────────────────────────────────────────────────
  route("GET", "/api/settings", async (_, res) => {
    const rows = db.prepare("SELECT key, value FROM onboarding").all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    for (const r of rows) {
      // Mask secrets
      if (r.key.startsWith("apikey_")) {
        settings[r.key] = r.value ? "••••••••" : "";
      } else {
        settings[r.key] = r.value;
      }
    }
    json(res, settings);
  });

  route("POST", "/api/settings", async (req, res) => {
    const body = (await readBody(req)) as Record<string, string>;
    for (const [k, v] of Object.entries(body)) {
      setOnboardingKey(db, k, v);
    }
    json(res, { ok: true });
  });

  // ── Health ───────────────────────────────────────────────────────────────────
  route("GET", "/api/health", async (_, res) => {
    json(res, { ok: true, version: "1.0.0", ts: Date.now() });
  });

  // ── Main request handler ─────────────────────────────────────────────────────
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://localhost:${port}`);
    const pathname = url.pathname;

    // CORS preflight
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      });
      res.end();
      return;
    }

    // API routing
    if (pathname.startsWith("/api/")) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const match = r.pattern.exec(pathname);
        if (!match) continue;
        const params: Record<string, string> = {};
        r.keys.forEach((k, i) => (params[k] = match[i + 1]));
        try {
          await r.handler(req, res, params);
        } catch (e) {
          json(res, { error: String(e) }, 500);
        }
        return;
      }
      json(res, { error: "Not found" }, 404);
      return;
    }

    // Static dashboard files
    const filePath = path.join(DASHBOARD_DIR, pathname === "/" ? "index.html" : pathname);
    serveStatic(res, filePath);
  });

  server.listen(port, () => {
    console.log(`[hub] Dashboard running at http://localhost:${port}`);
  });

  return server;
}
