import { useEffect, useState } from "react";
import { api, type Skill } from "../api.ts";
import { Card, CardTitle, PageTitle, Badge, Btn, Input } from "../components/Card.tsx";

export default function Skills() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selected, setSelected] = useState<Skill | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", content: "" });
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = () => api.getSkills().then(setSkills).catch(console.error);
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api.saveSkill({ ...form, source: "manual", tags: ["manual"], useCount: 0, successCount: 0 });
      await load();
      setAdding(false);
      setForm({ name: "", description: "", content: "" });
    } finally {
      setSaving(false);
    }
  }

  async function exportAll() {
    setExporting(true);
    try {
      const result = (await api.exportSkills()) as { dir?: string };
      alert(`Skills exported to ${result.dir}`);
    } finally {
      setExporting(false);
    }
  }

  const auto = skills.filter((s) => s.source === "auto");
  const manual = skills.filter((s) => s.source !== "auto");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle>Skills</PageTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="secondary" onClick={exportAll} disabled={exporting}>Export to Markdown</Btn>
          <Btn onClick={() => setAdding(true)}>+ Add skill</Btn>
        </div>
      </div>

      {adding && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>New Skill</CardTitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Name</label>
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. write_github_issue" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Description</label>
              <Input value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="When to use this skill" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Content (Markdown)</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={8}
                placeholder="# Skill: write_github_issue&#10;&#10;## When to use&#10;...&#10;&#10;## Steps&#10;..."
                style={{ width: "100%", background: "#0d1117", border: "1px solid #30363d", borderRadius: 6, color: "#c9d1d9", padding: "8px 10px", fontSize: 13, fontFamily: "monospace", resize: "vertical" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => setAdding(false)} disabled={saving}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.name.trim()}>Save skill</Btn>
          </div>
        </Card>
      )}

      {selected && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f6fc" }}>{selected.name}</div>
            <Btn variant="secondary" onClick={() => setSelected(null)}>Close</Btn>
          </div>
          <pre style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 6, padding: 16, fontSize: 12, color: "#c9d1d9", overflow: "auto", maxHeight: 400 }}>
            {selected.content}
          </pre>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        {[
          { title: `Auto-generated (${auto.length})`, items: auto, desc: "Created by Hub from successful tool calls" },
          { title: `Manual / Imported (${manual.length})`, items: manual, desc: "Created by you or imported from agentskills.io" },
        ].map(({ title, items, desc }) => (
          <Card key={title}>
            <CardTitle>{title}</CardTitle>
            <p style={{ fontSize: 12, color: "#484f58", marginBottom: 12 }}>{desc}</p>
            {items.length === 0 && <div style={{ color: "#484f58", fontSize: 13 }}>None yet.</div>}
            {items.map((s) => (
              <div key={s.id} style={{ borderTop: "1px solid #21262d", padding: "8px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div
                    style={{ fontSize: 13, color: "#58a6ff", cursor: "pointer", fontFamily: "monospace" }}
                    onClick={() => setSelected(s)}
                  >
                    {s.name}
                  </div>
                  <span style={{ fontSize: 11, color: "#484f58" }}>{s.useCount} uses</span>
                </div>
                <div style={{ fontSize: 12, color: "#8b949e", marginTop: 2 }}>{s.description}</div>
                <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
                  {s.tags.slice(0, 3).map((t) => <Badge key={t} color="#6e7681">{t}</Badge>)}
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  );
}
