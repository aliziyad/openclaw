import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig, EmployeeConfig } from "../config/config.js";
import { resolveAgentWorkspaceDir, resolveDefaultAgentId } from "../agents/agent-scope.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import { ensureDir } from "../memory/internal.js";

const log = createSubsystemLogger("budget");

// Approximate pricing per 1M tokens (as of early 2026)
const PRICING_TABLE: Record<string, { input: number; output: number }> = {
  "anthropic/claude-3-5-sonnet": { input: 3.0, output: 15.0 },
  "anthropic/claude-3-opus": { input: 15.0, output: 75.0 },
  "anthropic/claude-3-haiku": { input: 0.25, output: 1.25 },
  "openai/gpt-4o": { input: 5.0, output: 15.0 },
  "openai/gpt-4o-mini": { input: 0.15, output: 0.6 },
  "google/gemini-1.5-pro": { input: 3.5, output: 10.5 },
  "google/gemini-1.5-flash": { input: 0.075, output: 0.3 },
};

export class BudgetManager {
  private spent = new Map<string, number>();
  private initialized = false;

  private async ensureInitialized(cfg: OpenClawConfig) {
    if (this.initialized) return;
    try {
      const agentId = resolveDefaultAgentId(cfg);
      const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
      const filePath = path.join(workspaceDir, "company", "finance", "spent.json");
      const data = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(data);
      for (const [id, amount] of Object.entries(parsed)) {
        this.spent.set(id, amount as number);
      }
    } catch {
      // Ignore missing or malformed file
    }
    this.initialized = true;
  }

  private async persist(cfg: OpenClawConfig) {
    try {
      const agentId = resolveDefaultAgentId(cfg);
      const workspaceDir = resolveAgentWorkspaceDir(cfg, agentId);
      const dir = path.join(workspaceDir, "company", "finance");
      await ensureDir(dir);
      const filePath = path.join(dir, "spent.json");
      const data = Object.fromEntries(this.spent.entries());
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      log.error(`Failed to persist budget: ${String(err)}`);
    }
  }

  calculateCost(model: string, inputTokens: number, outputTokens: number): number {
    const pricing = PRICING_TABLE[model] || { input: 10.0, output: 30.0 }; // Default high-end pricing
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return inputCost + outputCost;
  }

  async recordSpend(agentId: string, cost: number, cfg: OpenClawConfig) {
    await this.ensureInitialized(cfg);
    const current = this.spent.get(agentId) || 0;
    this.spent.set(agentId, current + cost);
    log.debug(`Recorded $${cost.toFixed(4)} spend for ${agentId}. Total: $${(current + cost).toFixed(4)}`);
    await this.persist(cfg);
  }

  getSpend(agentId: string): number {
    return this.spent.get(agentId) || 0;
  }

  isWithinBudget(employee: EmployeeConfig): boolean {
    const spent = this.getSpend(employee.id);
    return spent < employee.budgetLimit;
  }

  getRemainingBudget(employee: EmployeeConfig): number {
    return Math.max(0, employee.budgetLimit - this.getSpend(employee.id));
  }
}

export const budgetManager = new BudgetManager();
