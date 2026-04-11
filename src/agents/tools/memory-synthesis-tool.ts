import { Type } from "@sinclair/typebox";
import fs from "node:fs/promises";
import path from "node:path";
import type { OpenClawConfig } from "../../config/config.js";
import type { AnyAgentTool } from "./common.js";
import { resolveAgentWorkspaceDir, resolveSessionAgentId } from "../agent-scope.js";
import { jsonResult, readStringParam, readStringArrayParam } from "./common.js";
import { ensureDir } from "../../memory/internal.js";
import { resolveSessionTranscriptsDirForAgent } from "../../config/sessions/paths.js";

const MemorySynthesizeSchema = Type.Object({
  targetSopName: Type.String({ description: "Name of the SOP to create or update" }),
  sourceJournals: Type.Optional(Type.Array(Type.String(), { description: "Optional list of specific journal file paths to include" })),
  sourceSessions: Type.Optional(Type.Array(Type.String(), { description: "Optional list of specific session IDs to include" })),
  instructions: Type.Optional(Type.String({ description: "Special instructions for the synthesis (e.g. 'Focus on the deployment steps')" })),
});

export function createMemorySynthesizeTool(options: {
  config?: OpenClawConfig;
  agentSessionKey?: string;
  workspaceDir?: string;
}): AnyAgentTool | null {
  const cfg = options.config;
  if (!cfg) {
    return null;
  }

  const agentId = resolveSessionAgentId({
    sessionKey: options.agentSessionKey,
    config: cfg,
  });

  const workspaceDir = options.workspaceDir || (agentId ? resolveAgentWorkspaceDir(cfg, agentId) : undefined);
  if (!workspaceDir) {
    return null;
  }

  return {
    label: "Memory Synthesize",
    name: "memory_synthesize",
    description: "Synthesize recent journals and session transcripts into a high-quality SOP (Standard Operating Procedure). This tool 'refines' memory by distilling multi-step tasks into efficient procedures. SOPs are stored in memory/sops/ and prioritized for future work.",
    parameters: MemorySynthesizeSchema,
    execute: async (_toolCallId, params) => {
      const targetSopName = readStringParam(params, "targetSopName", { required: true });
      const instructions = readStringParam(params, "instructions") || "Distill the most efficient path to complete this task.";

      // In a real implementation, this tool would likely trigger a specialized sub-agent
      // or a specific prompt to the current agent to perform the synthesis.
      // For now, we will set up the structure and provide a helpful response.

      const sopDir = path.join(workspaceDir, "memory", "sops");
      const fileName = `${targetSopName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`;
      const filePath = path.join(sopDir, fileName);

      try {
        await ensureDir(sopDir);

        // This is a placeholder for the actual LLM synthesis logic.
        // In a full implementation, we'd read the transcripts and journals here.

        return jsonResult({
          status: "ready_for_synthesis",
          message: `I have prepared the environment for synthesizing the '${targetSopName}' SOP. Please provide the refined content you'd like to save, or I can attempt to generate it based on recent transcripts.`,
          sopPath: path.relative(workspaceDir, filePath),
          sopDir: path.relative(workspaceDir, sopDir)
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return jsonResult({ status: "error", error: message });
      }
    },
  };
}
