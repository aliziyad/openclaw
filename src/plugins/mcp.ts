import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { createSubsystemLogger } from "../logging/subsystem.js";
import type { OpenClawConfig, McpServerConfig } from "../config/config.js";
import type { AnyAgentTool } from "../agents/tools/common.js";
import { jsonResult } from "../agents/tools/common.js";

const log = createSubsystemLogger("mcp");

export class McpManager {
  private clients = new Map<string, Client>();

  async getTools(cfg: OpenClawConfig): Promise<AnyAgentTool[]> {
    if (!cfg.mcp?.enabled || !cfg.mcp.servers) {
      return [];
    }

    const allTools: AnyAgentTool[] = [];
    for (const [name, serverCfg] of Object.entries(cfg.mcp.servers)) {
      try {
        const tools = await this.loadServerTools(name, serverCfg);
        allTools.push(...tools);
      } catch (err) {
        log.error(`Failed to load tools from MCP server ${name}: ${String(err)}`);
      }
    }
    return allTools;
  }

  private async loadServerTools(name: string, serverCfg: McpServerConfig): Promise<AnyAgentTool[]> {
    let client = this.clients.get(name);
    if (!client) {
      const transport = new StdioClientTransport({
        command: serverCfg.command,
        args: serverCfg.args ?? [],
        env: { ...process.env, ...serverCfg.env } as any,
      });

      client = new Client(
        { name: "openclaw-client", version: "1.0.0" },
        { capabilities: { tools: {} } }
      );

      await client.connect(transport);
      this.clients.set(name, client);
      log.info(`Connected to MCP server: ${name}`);
    }

    const { tools } = await client.listTools();

    return tools.map(mcpTool => ({
      name: `mcp_${name}_${mcpTool.name}`,
      label: `${name}: ${mcpTool.name}`,
      description: mcpTool.description ?? "",
      parameters: mcpTool.inputSchema as any,
      execute: async (toolCallId, params) => {
        const result = await client!.callTool({
          name: mcpTool.name,
          arguments: params as any,
        });
        return jsonResult(result.content);
      }
    }));
  }

  async close() {
    for (const client of this.clients.values()) {
      await client.close();
    }
    this.clients.clear();
  }
}

export const mcpManager = new McpManager();
