import { useEffect, useState } from "react";
import { api, type OverviewData } from "../api.ts";
import { Card, CardTitle, PageTitle, Grid, BudgetBar, Badge } from "../components/Card.tsx";

export default function Overview() {
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    api.getOverview().then(setData).catch(console.error);
    const id = setInterval(() => api.getOverview().then(setData).catch(() => {}), 15000);
    return () => clearInterval(id);
  }, []);

  if (!data) return <div style={{ color: "#8b949e" }}>Loading…</div>;

  const stat = (label: string, value: string | number, sub?: string) => (
    <Card key={label}>
      <div style={{ fontSize: 28, fontWeight: 700, color: "#f0f6fc" }}>{value}</div>
      <div style={{ fontSize: 12, color: "#8b949e", marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: "#484f58", marginTop: 2 }}>{sub}</div>}
    </Card>
  );

  const totalSpent = data.budget.reduce((s, b) => s + b.spent, 0);
  const totalBudget = data.budget.reduce((s, b) => s + b.budget, 0);

  return (
    <div>
      <PageTitle>Overview</PageTitle>

      <Grid cols={4}>
        {stat("Active Agents", data.agents.filter((a) => a.active).length)}
        {stat("Businesses", (data.businesses as unknown[]).length)}
        {stat("Posts Today", data.postsToday)}
        {stat("Skills", data.skillsCount)}
      </Grid>

      <div style={{ marginTop: 24 }}>
        <Card>
          <CardTitle>Monthly Budget Usage</CardTitle>
          <div style={{ fontSize: 13, color: "#8b949e", marginBottom: 16 }}>
            ${totalSpent.toFixed(4)} of ${totalBudget.toFixed(2)} used this month
          </div>
          {data.budget.map((b) => (
            <div key={b.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                <span style={{ color: "#c9d1d9" }}>{b.name}</span>
                <span style={{ color: b.exceeded ? "#f85149" : "#8b949e" }}>
                  ${b.spent.toFixed(4)} / ${b.budget.toFixed(2)}
                  {b.exceeded && <Badge color="#f85149" children=" OVER BUDGET" />}
                </span>
              </div>
              <BudgetBar pct={b.pct} exceeded={b.exceeded} />
            </div>
          ))}
        </Card>
      </div>

      <div style={{ marginTop: 24 }}>
        <Card>
          <CardTitle>Agents</CardTitle>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "#8b949e", textAlign: "left" }}>
                <th style={{ paddingBottom: 8 }}>Name</th>
                <th style={{ paddingBottom: 8 }}>Kind</th>
                <th style={{ paddingBottom: 8 }}>Model</th>
                <th style={{ paddingBottom: 8 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.agents.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #21262d" }}>
                  <td style={{ padding: "8px 0", color: "#f0f6fc" }}>{a.name}</td>
                  <td style={{ padding: "8px 0" }}><Badge>{a.kind}</Badge></td>
                  <td style={{ padding: "8px 0", color: "#8b949e" }}>{a.model ?? "—"}</td>
                  <td style={{ padding: "8px 0" }}>
                    <Badge color={a.active ? "#238636" : "#6e7681"}>{a.active ? "active" : "inactive"}</Badge>
                  </td>
                </tr>
              ))}
              {data.agents.length === 0 && (
                <tr><td colSpan={4} style={{ padding: "12px 0", color: "#484f58" }}>No agents yet. Add one in Settings.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
