import { useEffect, useState } from "react";
import { api, type Business } from "../api.ts";
import { Card, CardTitle, PageTitle, Badge, Btn, Input } from "../components/Card.tsx";

const PLATFORMS = ["twitter", "instagram", "facebook", "youtube", "tiktok"];

export default function Businesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<Partial<Business>>({ platforms: ["twitter", "instagram", "facebook"], topics: [], imagePrompts: [] });
  const [saving, setSaving] = useState(false);
  const [topicInput, setTopicInput] = useState("");
  const [promptInput, setPromptInput] = useState("");

  const load = () => api.getBusinesses().then(setBusinesses).catch(console.error);
  useEffect(() => { load(); }, []);

  async function save() {
    setSaving(true);
    try {
      await api.saveBusiness(form);
      await load();
      setAdding(false);
      setForm({ platforms: ["twitter", "instagram", "facebook"], topics: [], imagePrompts: [] });
    } finally {
      setSaving(false);
    }
  }

  function togglePlatform(p: string) {
    const cur = form.platforms ?? [];
    setForm({ ...form, platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle>Businesses</PageTitle>
        {!adding && <Btn onClick={() => setAdding(true)}>+ Add business</Btn>}
      </div>

      {adding && (
        <Card style={{ marginBottom: 24 }}>
          <CardTitle>New Business</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Name *</label>
              <Input value={form.name ?? ""} onChange={(v) => setForm({ ...form, name: v })} placeholder="Fit Life Studio" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Description</label>
              <Input value={form.description ?? ""} onChange={(v) => setForm({ ...form, description: v })} placeholder="Fitness & wellness brand" />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 8 }}>Platforms</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PLATFORMS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePlatform(p)}
                  style={{
                    padding: "4px 10px", borderRadius: 4, fontSize: 12, cursor: "pointer",
                    background: form.platforms?.includes(p) ? "#1f6feb22" : "#21262d",
                    border: `1px solid ${form.platforms?.includes(p) ? "#1f6feb" : "#30363d"}`,
                    color: form.platforms?.includes(p) ? "#58a6ff" : "#8b949e",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Topics (press Enter to add)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={topicInput} onChange={setTopicInput} placeholder="e.g. high-protein snacks" />
              <Btn variant="secondary" onClick={() => {
                if (topicInput.trim()) {
                  setForm({ ...form, topics: [...(form.topics ?? []), topicInput.trim()] });
                  setTopicInput("");
                }
              }}>Add</Btn>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {(form.topics ?? []).map((t, i) => (
                <span key={i} style={{ background: "#21262d", border: "1px solid #30363d", borderRadius: 4, padding: "2px 8px", fontSize: 12, color: "#8b949e", cursor: "pointer" }}
                  onClick={() => setForm({ ...form, topics: (form.topics ?? []).filter((_, j) => j !== i) })}>
                  {t} ✕
                </span>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>Image prompts (press Enter to add)</label>
            <div style={{ display: "flex", gap: 8 }}>
              <Input value={promptInput} onChange={setPromptInput} placeholder="e.g. Fitness woman doing kettlebell swing..." />
              <Btn variant="secondary" onClick={() => {
                if (promptInput.trim()) {
                  setForm({ ...form, imagePrompts: [...(form.imagePrompts ?? []), promptInput.trim()] });
                  setPromptInput("");
                }
              }}>Add</Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
              {(form.imagePrompts ?? []).map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "#8b949e", background: "#21262d", borderRadius: 4, padding: "4px 8px", display: "flex", justifyContent: "space-between" }}>
                  {p}
                  <span style={{ cursor: "pointer" }} onClick={() => setForm({ ...form, imagePrompts: (form.imagePrompts ?? []).filter((_, j) => j !== i) })}>✕</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
            <Btn variant="secondary" onClick={() => setAdding(false)} disabled={saving}>Cancel</Btn>
            <Btn onClick={save} disabled={saving || !form.name?.trim()}>Save business</Btn>
          </div>
        </Card>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {businesses.map((b) => (
          <Card key={b.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#f0f6fc" }}>{b.name}</div>
              <Badge color={b.active ? "#238636" : "#6e7681"}>{b.active ? "active" : "inactive"}</Badge>
            </div>
            {b.description && <div style={{ fontSize: 12, color: "#8b949e", marginBottom: 12 }}>{b.description}</div>}
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
              {b.platforms.map((p) => <Badge key={p} color="#1f6feb">{p}</Badge>)}
            </div>
            <div style={{ fontSize: 12, color: "#484f58" }}>
              {b.topics.length} topics · {b.imagePrompts.length} image prompts
            </div>
          </Card>
        ))}
        {businesses.length === 0 && !adding && (
          <div style={{ color: "#484f58", fontSize: 13 }}>No businesses yet. Add your first one above.</div>
        )}
      </div>
    </div>
  );
}
