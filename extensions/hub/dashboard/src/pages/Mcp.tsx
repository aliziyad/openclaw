import { useEffect, useState } from "react";
import { api, type McpServer, type McpTool } from "../api.ts";
import { Card, CardTitle, PageTitle, Badge, Btn, Input } from "../components/Card.tsx";

export default function Mcp() {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<McpServer>>({ transport: "http" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    api.getMcpServers().then(setServers).catch(console.error);
    api.getMcpTools().then(setTools).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api.saveMcpServer(form);
      await load();
      setAdding(false);
      setForm({ transport: "http" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle>MCP</PageTitle>
        {!adding && <Btn onClick={() => setAdding(true)}>+ Add server</Btn>}
      </div>

      <Card style={{ marginBottom: 20, padding: 16 }}>
        <p style={{ fontSize: 13, color: "#8b949e" }}>
          Model Context Protocol (MCP) lets any MCP-compatible tool connect to your agents.
          Hub exposes its own MCP endpoint at <code style={{ background: "#21262d", padding: "1px 6px", borderRadius: 3 }}>http://localhost:3001/api/mcp</code>.
        </p>
      </Card>

      {adding && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>New MCP Server</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Name", "name", "My MCP Server"],
              ["Transport", "transport", "stdio / http"],
              ["URL (HTTP transport)", "url", "http://localhost:8080/mcp"],
              ["Command (stdio transport)", "command", "npx my-mcp-server"],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>{label}</label>
                <Input
                  value={String((form as Record<string, unknown>)[key] ?? "")}
                  onChange={(v) => setForm({ ...form, [key]: v })}
                  placeholder={ph}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="secondary" onClick={() => setAdding(false)} disabled={saving}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.name?.trim()}>Save server</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <Card>
          <CardTitle>Registered Servers ({servers.length})</CardTitle>
          {servers.length === 0 && <div style={{ color: "#484f58", fontSize: 13 }}>No MCP servers yet.</div>}
          {servers.map((s) => (
            <div key={s.id} style={{ borderTop: "1px solid #21262d", padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "#f0f6fc" }}>{s.name}</span>
                <Badge color={s.enabled ? "#238636" : "#6e7681"}>{s.enabled ? "enabled" : "disabled"}</Badge>
              </div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>
                <Badge color="#1f6feb">{s.transport}</Badge>
                {s.url && <span style={{ marginLeft: 8, fontFamily: "monospace" }}>{s.url}</span>}
                {s.command && <span style={{ marginLeft: 8, fontFamily: "monospace" }}>{s.command}</span>}
              </div>
            </div>
          ))}
        </Card>

        <Card>
          <CardTitle>Available Tools ({tools.length})</CardTitle>
          {tools.length === 0 && <div style={{ color: "#484f58", fontSize: 13 }}>No tools registered.</div>}
          {tools.map((t) => (
            <div key={t.name} style={{ borderTop: "1px solid #21262d", padding: "10px 0" }}>
              <div style={{ fontSize: 13, color: "#58a6ff", fontFamily: "monospace" }}>{t.name}</div>
              <div style={{ fontSize: 12, color: "#8b949e", marginTop: 2 }}>{t.description}</div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
