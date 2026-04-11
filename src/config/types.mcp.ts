export type McpServerConfig = {
  command: string;
  args?: string[];
  env?: Record<string, string>;
};

export type McpConfig = {
  /** Enable Model Context Protocol (MCP) support. */
  enabled?: boolean;
  /** Configuration for MCP servers. */
  servers?: Record<string, McpServerConfig>;
};
