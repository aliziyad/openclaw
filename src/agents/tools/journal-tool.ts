import { Type } from "@sinclair/typebox";
import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { resolveAgentWorkspaceDir } from "../agent-scope.js";
import { jsonResult, readStringParam } from "./common.js";
import { ensureDir } from "../../memory/internal.js";

const JournalLogSchema = Type.Object({
  taskName: Type.String({ description: "Short descriptive name of the task" }),
  summary: Type.String({ description: "Brief summary of what was achieved" }),
  steps: Type.Optional(Type.Array(Type.String(), { description: "Key steps taken to complete the task" })),
  shortcuts: Type.Optional(Type.Array(Type.String(), { description: "Shortcuts or optimizations for next time" })),
  outcome: Type.Optional(Type.Union([Type.Literal("success"), Type.Literal("failure"), Type.Literal("partial")])),
});

export function createJournalTool(options: {
  config?: OpenClawConfig;
  agentSessionKey?: string;
  workspaceDir?: string;
}): AnyAgentTool | null {
  const cfg = options.config;
  if (!cfg) {
    return null;
  }

  // Use provided workspaceDir or resolve it from config/session
  const workspaceDir = options.workspaceDir;
  if (!workspaceDir) {
    return null;
  }

  return {
    label: "Journal Log",
    name: "journal_log",
    description: "Record a task summary to the Captain's Journal for long-term memory and efficiency. Use this after completing significant tasks to document 'shortcuts' and successful SOP steps. Journals are stored in memory/journals/ and prioritized for future task recall.",
    parameters: JournalLogSchema,
    execute: async (_toolCallId, params) => {
      const taskName = readStringParam(params, "taskName", { required: true });
      const summary = readStringParam(params, "summary", { required: true });
      const steps = params.steps as string[] | undefined;
      const shortcuts = params.shortcuts as string[] | undefined;
      const outcome = (params.outcome as string) ?? "success";

      const journalDir = path.join(workspaceDir, "memory", "journals");
      const fileName = `${taskName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
      const filePath = path.join(journalDir, fileName);

      let content = `# Task: ${taskName}\n\n`;
      content += `**Outcome:** ${outcome}\n`;
      content += `**Date:** ${new Date().toISOString()}\n\n`;
      content += `## Summary\n${summary}\n\n`;

      if (steps && steps.length > 0) {
        content += `## Steps Taken\n`;
        for (const step of steps) {
          content += `- ${step}\n`;
        }
        content += `\n`;
      }

      if (shortcuts && shortcuts.length > 0) {
        content += `## Shortcuts & Optimizations\n`;
        for (const shortcut of shortcuts) {
          content += `- ${shortcut}\n`;
        }
        content += `\n`;
      }

      try {
        await ensureDir(journalDir);
        await fs.writeFile(filePath, content, "utf-8");
        return jsonResult({
          status: "logged",
          path: path.relative(workspaceDir, filePath),
          message: `Journal entry recorded for task: ${taskName}`
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}
