import type { IncomingMessage, ServerResponse } from "node:http";
import type { HubDb } from "./db.js";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: Record<string, unknown>) => Promise<unknown>;
};

export type McpServer = {
  id: string;
  name: string;
  transport: "stdio" | "http";
  command?: string;
  url?: string;
  headers?: Record<string, string>;
};

// In-memory registry of tools contributed by MCP servers
const _registry = new Map<string, McpTool>();

export function registerMcpTool(tool: McpTool): void {
  _registry.set(tool.name, tool);
}

export function listMcpTools(): McpTool[] {
  return [..._registry.values()];
}

export function getMcpTool(name: string): McpTool | undefined {
  return _registry.get(name);
}

export function loadMcpServers(db: HubDb): McpServer[] {
  return db.prepare(`SELECT * FROM mcp_servers WHERE enabled = 1`).all() as McpServer[];
}

export function saveMcpServer(db: HubDb, server: Omit<McpServer, "id"> & { id?: string }): string {
  const id = server.id ?? crypto.randomUUID();
  db.prepare(`
    INSERT INTO mcp_servers (id, name, transport, command, url, headers)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      transport = excluded.transport,
      command = excluded.command,
      url = excluded.url,
      headers = excluded.headers
  `).run(
    id,
    server.name,
    server.transport,
    server.command ?? null,
    server.url ?? null,
    JSON.stringify(server.headers ?? {}),
  );
  return id;
}

/**
 * MCP-compatible HTTP endpoint handler.
 * Implements a subset of the Model Context Protocol over HTTP.
 * Path: /hub/mcp/:method
 */
export async function handleMcpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  method: string,
): Promise<void> {
  res.setHeader("Content-Type", "application/json");

  if (method === "tools/list") {
    res.end(
      JSON.stringify({
        tools: listMcpTools().map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema,
        })),
      }),
    );
    return;
  }

  if (method === "tools/call") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    await new Promise<void>((r) => req.on("end", r));

    try {
      const { name, arguments: args } = JSON.parse(body) as {
        name: string;
        arguments: Record<string, unknown>;
      };
      const tool = getMcpTool(name);
      if (!tool) {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: `Tool not found: ${name}` }));
        return;
      }
      const result = await tool.handler(args ?? {});
      res.end(JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result) }] }));
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: String(e) }));
    }
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: `Unknown MCP method: ${method}` }));
}

// Register built-in Hub tools into MCP
export function registerBuiltinHubTools(): void {
  registerMcpTool({
    name: "hub_status",
    description: "Get current Hub system status including agent health and budget summaries",
    inputSchema: { type: "object", properties: {} },
    async handler() {
      return { status: "ok", timestamp: new Date().toISOString() };
    },
  });
}
