import type { HubDb } from "./db.js";

export type CostEntry = {
  agentId: string;
  businessId?: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
};

// Approximate token costs in USD per 1k tokens (input/output)
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  "claude-opus-4-6": { input: 0.015, output: 0.075 },
  "claude-sonnet-4-6": { input: 0.003, output: 0.015 },
  "claude-haiku-4-5": { input: 0.00025, output: 0.00125 },
  "gpt-4o": { input: 0.005, output: 0.015 },
  "gemini-2.0-flash": { input: 0.0001, output: 0.0004 },
  "meta-llama/Llama-3-3-70b-instruct": { input: 0.0009, output: 0.0009 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const key = Object.keys(MODEL_COSTS).find((k) => model.includes(k)) ?? "";
  const rates = MODEL_COSTS[key] ?? { input: 0.002, output: 0.01 };
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}

export function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function recordCost(db: HubDb, entry: CostEntry): void {
  db.prepare(`
    INSERT INTO budget_entries
      (agent_id, business_id, provider, model, input_tokens, output_tokens, cost_usd, month)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.agentId,
    entry.businessId ?? null,
    entry.provider,
    entry.model,
    entry.inputTokens,
    entry.outputTokens,
    entry.costUsd,
    currentMonth(),
  );
}

export function getMonthlySpend(db: HubDb, agentId: string, month?: string): number {
  const m = month ?? currentMonth();
  const row = db
    .prepare(`SELECT SUM(cost_usd) as total FROM budget_entries WHERE agent_id = ? AND month = ?`)
    .get(agentId, m) as { total: number | null };
  return row?.total ?? 0;
}

export function getMonthlyBudget(db: HubDb, agentId: string): number {
  const row = db
    .prepare(`SELECT monthly_budget_usd FROM agents WHERE id = ?`)
    .get(agentId) as { monthly_budget_usd: number } | undefined;
  return row?.monthly_budget_usd ?? 20;
}

export function isBudgetExceeded(db: HubDb, agentId: string): boolean {
  return getMonthlySpend(db, agentId) >= getMonthlyBudget(db, agentId);
}

export function getBudgetSummary(db: HubDb) {
  const month = currentMonth();
  const rows = db
    .prepare(`
      SELECT
        a.id, a.name, a.monthly_budget_usd as budget,
        COALESCE(SUM(b.cost_usd), 0) as spent
      FROM agents a
      LEFT JOIN budget_entries b ON b.agent_id = a.id AND b.month = ?
      GROUP BY a.id
    `)
    .all(month) as Array<{ id: string; name: string; budget: number; spent: number }>;

  return rows.map((r) => ({
    ...r,
    remaining: Math.max(0, r.budget - r.spent),
    pct: Math.min(100, (r.spent / r.budget) * 100),
    exceeded: r.spent >= r.budget,
  }));
}

export function getDailySpendByBusiness(db: HubDb, businessId: string, days = 30) {
  return db
    .prepare(`
      SELECT
        date(created_at, 'unixepoch') as day,
        SUM(cost_usd) as total
      FROM budget_entries
      WHERE business_id = ?
        AND created_at > unixepoch() - ? * 86400
      GROUP BY day
      ORDER BY day
    `)
    .all(businessId, days) as Array<{ day: string; total: number }>;
}
