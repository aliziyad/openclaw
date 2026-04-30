import { useEffect, useState } from "react";
import { api, type BudgetEntry } from "../api.ts";
import { Card, CardTitle, PageTitle, BudgetBar, Badge } from "../components/Card.tsx";

export default function Budget() {
  const [budget, setBudget] = useState<BudgetEntry[]>([]);

  useEffect(() => {
    api.getBudget().then(setBudget).catch(console.error);
    const id = setInterval(() => api.getBudget().then(setBudget).catch(() => {}), 30000);
    return () => clearInterval(id);
  }, []);

  const total = { spent: budget.reduce((s, b) => s + b.spent, 0), budget: budget.reduce((s, b) => s + b.budget, 0) };

  return (
    <div>
      <PageTitle>Budget</PageTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total spent (month)", value: `$${total.spent.toFixed(4)}` },
          { label: "Total budget (month)", value: `$${total.budget.toFixed(2)}` },
          { label: "Over budget", value: budget.filter((b) => b.exceeded).length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#f0f6fc" }}>{value}</div>
            <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>{label}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Per-Agent Budget</CardTitle>
        {budget.length === 0 && (
          <div style={{ color: "#484f58", fontSize: 13 }}>No agents found. Add agents in the Agents page.</div>
        )}
        {budget.map((b) => (
          <div key={b.id} style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 14, color: "#f0f6fc", fontWeight: 500 }}>{b.name}</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {b.exceeded && <Badge color="#f85149">OVER BUDGET</Badge>}
                <span style={{ fontSize: 13, color: "#8b949e" }}>
                  ${b.spent.toFixed(4)} / ${b.budget.toFixed(2)}
                  <span style={{ color: "#484f58" }}> ({b.pct.toFixed(1)}%)</span>
                </span>
              </div>
            </div>
            <BudgetBar pct={b.pct} exceeded={b.exceeded} />
            <div style={{ fontSize: 11, color: "#484f58", marginTop: 4 }}>
              ${b.remaining.toFixed(4)} remaining this month
            </div>
          </div>
        ))}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <CardTitle>Cost Model Reference</CardTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#8b949e", textAlign: "left" }}>
              <th style={{ paddingBottom: 8 }}>Model</th>
              <th style={{ paddingBottom: 8 }}>Input / 1k tokens</th>
              <th style={{ paddingBottom: 8 }}>Output / 1k tokens</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Claude Opus 4.6", "$0.015", "$0.075"],
              ["Claude Sonnet 4.6", "$0.003", "$0.015"],
              ["GPT-4o", "$0.005", "$0.015"],
              ["Gemini 2.0 Flash", "$0.0001", "$0.0004"],
              ["Llama-3-3-70b (Together.ai)", "$0.0009", "$0.0009"],
            ].map(([model, input, output]) => (
              <tr key={model} style={{ borderTop: "1px solid #21262d" }}>
                <td style={{ padding: "6px 0", color: "#c9d1d9" }}>{model}</td>
                <td style={{ padding: "6px 0", color: "#8b949e" }}>{input}</td>
                <td style={{ padding: "6px 0", color: "#8b949e" }}>{output}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
