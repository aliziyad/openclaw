import type { OpenClawPluginApi } from "../../src/plugins/types.js";
import { openDb } from "./src/db.js";
import { createHubServer } from "./src/server.js";
import { generateSkillFromToolCall, saveSkill } from "./src/skills.js";
import { extractFacts, upsertFacts, buildUserContext } from "./src/user-model.js";
import { recordCost, estimateCost, isBudgetExceeded } from "./src/budget.js";
import { registerBuiltinHubTools } from "./src/mcp.js";

export default function register(api: OpenClawPluginApi) {
  const port = (api.pluginConfig?.port as number | undefined) ?? 3001;
  let db: ReturnType<typeof openDb> | undefined;

  // ── Service: start Hub server when gateway starts ──────────────────────────
  api.registerService({
    id: "hub-dashboard",
    async start(ctx) {
      db = openDb(ctx.stateDir);
      registerBuiltinHubTools();
      createHubServer(db, port);
      api.logger.info(`[hub] Dashboard available at http://localhost:${port}`);
    },
    async stop() {
      api.logger.info("[hub] Shutting down");
    },
  });

  // ── Hook: self-improving skills — auto-generate from successful tool calls ──
  api.on("after_tool_call", (event) => {
    if (!db) return;
    const { toolName, input, output, durationMs, agentId, success } = event as {
      toolName: string;
      input: Record<string, unknown>;
      output: string;
      durationMs: number;
      agentId: string;
      success: boolean;
    };

    const skill = generateSkillFromToolCall({ agentId, toolName, input, output, durationMs, success });
    if (skill) {
      try {
        saveSkill(db, skill);
      } catch {
        // non-fatal
      }
    }
  });

  // ── Hook: user modeling — extract preferences from conversations ────────────
  api.on("message_sent", (event) => {
    if (!db) return;
    const { agentId, userMessage, assistantMessage } = event as {
      agentId?: string;
      userMessage?: string;
      assistantMessage?: string;
    };
    if (!agentId || !userMessage) return;
    const facts = extractFacts(userMessage, assistantMessage ?? "");
    if (facts.length > 0) {
      try {
        upsertFacts(db, agentId, facts);
      } catch {
        // non-fatal
      }
    }
  });

  // ── Hook: inject user context into agent prompt ─────────────────────────────
  api.on("before_agent_start", (event) => {
    if (!db) return;
    const { agentId, systemPrompt } = event as {
      agentId?: string;
      systemPrompt?: string;
    };
    if (!agentId || !systemPrompt) return;
    const ctx = buildUserContext(db, agentId);
    if (ctx && typeof (event as Record<string, unknown>).systemPrompt === "string") {
      (event as Record<string, unknown>).systemPrompt = systemPrompt + ctx;
    }
  });

  // ── Hook: budget enforcement — record cost and block if over budget ─────────
  api.on("after_tool_call", (event) => {
    if (!db) return;
    const { agentId, toolName, inputTokens, outputTokens, model, provider } = event as {
      agentId?: string;
      toolName?: string;
      inputTokens?: number;
      outputTokens?: number;
      model?: string;
      provider?: string;
    };
    if (!agentId || !model || !provider) return;
    const inp = inputTokens ?? 0;
    const out = outputTokens ?? 0;
    if (inp === 0 && out === 0) return;
    try {
      recordCost(db, {
        agentId,
        provider,
        model,
        inputTokens: inp,
        outputTokens: out,
        costUsd: estimateCost(model, inp, out),
      });
      if (isBudgetExceeded(db, agentId)) {
        api.logger.warn(`[hub] Budget exceeded for agent ${agentId} — further tool calls may be blocked`);
      }
    } catch {
      // non-fatal
    }
  });

  // ── Chat command: /hub ──────────────────────────────────────────────────────
  api.registerCommand({
    name: "hub",
    description: "Open the Hub dashboard",
    async handle(_ctx, _args) {
      return `Hub dashboard: http://localhost:${port}`;
    },
  });
}
