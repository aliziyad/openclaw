import { getMemorySearchManager } from "../memory/search-manager.js";
import type { OpenClawConfig } from "../config/config.js";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("strategy-brief");

export async function generateStrategyBrief(params: {
  config: OpenClawConfig;
  agentId: string;
  prompt: string;
  sessionKey?: string;
}): Promise<string | null> {
  if (!params.config.memory?.enabled) {
    return null;
  }

  const { manager, error } = await getMemorySearchManager({
    cfg: params.config,
    agentId: params.agentId,
  });

  if (!manager) {
    if (error) log.debug(`Failed to get memory manager for strategy brief: ${error}`);
    return null;
  }

  try {
    // Search specifically for high-priority memory (Journals and SOPs)
    // We use a subset of the user's prompt to find relevant shortcuts
    const query = params.prompt.slice(0, 500); // Take first 500 chars for search
    const results = await manager.search(query, {
      maxResults: 3,
      minScore: 0.5,
      sessionKey: params.sessionKey,
    });

    const relevantShortcuts = results.filter(r =>
      r.path.startsWith("memory/journals/") ||
      r.path.startsWith("memory/sops/") ||
      r.path.includes("/SOP/") ||
      r.path.includes("/sop/")
    );

    if (relevantShortcuts.length === 0) {
      return null;
    }

    let brief = "### PROACTIVE STRATEGY BRIEF\n";
    brief += "I've found existing journals or SOPs that may contain shortcuts for your current task:\n\n";

    for (const res of relevantShortcuts) {
      brief += `#### From: ${res.path}\n`;
      brief += `${res.snippet.trim()}\n\n`;
    }

    brief += "Use these proven shortcuts to complete the task in fewer steps. Avoid reinventing the process if a documented shortcut exists.\n";

    return brief;
  } catch (err) {
    log.debug(`Error generating strategy brief: ${String(err)}`);
    return null;
  }
}
