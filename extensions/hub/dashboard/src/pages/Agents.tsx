import { useEffect, useState } from "react";
import { api, type Agent } from "../api.ts";
import { Card, CardTitle, PageTitle, Badge, Btn, Input } from "../components/Card.tsx";

export default function Agents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<Agent>>({ kind: "openclaw", monthly_budget_usd: 20 });
  const [saving, setSaving] = useState(false);

  const load = () => api.getAgents().then(setAgents).catch(console.error);
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api.saveAgent({ ...form, monthlyBudgetUsd: form.monthly_budget_usd } as unknown as Partial<Agent>);
      await load();
      setAdding(false);
      setForm({ kind: "openclaw", monthly_budget_usd: 20 });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle>Agents</PageTitle>
        {!adding && <Btn onClick={() => setAdding(true)}>+ Add agent</Btn>}
      </div>

      <Card style={{ marginBottom: 20, padding: 16 }}>
        <p style={{ fontSize: 13, color: "#8b949e" }}>
          Register your OpenClaw agents and Hermes instances here. Hub tracks their activity,
          enforces budgets, and surfaces them in the org chart.
        </p>
      </Card>

      {adding && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>New Agent</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              ["Name", "name", "Molty"],
              ["Kind", "kind", "openclaw / hermes"],
              ["Model", "model", "anthropic/claude-opus-4-6"],
              ["Endpoint", "endpoint", "ws://localhost:18789"],
              ["Monthly Budget (USD)", "monthly_budget_usd", "20"],
            ].map(([label, key, ph]) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>{label}</label>
                <Input
                  value={String((form as Record<string, unknown>)[key] ?? "")}
                  onChange={(v) => setForm({ ...form, [key]: key === "monthly_budget_usd" ? Number(v) : v })}
                  placeholder={ph}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="secondary" onClick={() => setAdding(false)} disabled={saving}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.name?.trim()}>Save agent</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {agents.map((a) => (
          <Card key={a.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f6fc" }}>{a.name}</div>
              <Badge color={a.active ? "#238636" : "#6e7681"}>{a.active ? "active" : "inactive"}</Badge>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <Badge color={a.kind === "hermes" ? "#6e40c9" : "#1f6feb"}>{a.kind}</Badge>
              {a.model && <Badge color="#21262d">{a.model}</Badge>}
            </div>
            {a.endpoint && (
              <div style={{ fontSize: 11, color: "#484f58", fontFamily: "monospace", marginBottom: 8 }}>{a.endpoint}</div>
            )}
            <div style={{ fontSize: 12, color: "#8b949e" }}>
              Budget: ${a.monthly_budget_usd}/mo
            </div>
          </Card>
        ))}
        {agents.length === 0 && !adding && (
          <div style={{ color: "#484f58", fontSize: 13 }}>No agents yet. Add one above.</div>
        )}
      </div>
    </div>
  );
}
