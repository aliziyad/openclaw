import { useEffect, useState } from "react";
import { api } from "../api.ts";
import { Card, CardTitle, PageTitle, Btn, Input } from "../components/Card.tsx";

type Section = { title: string; keys: Array<{ key: string; label: string; type?: string; placeholder?: string }> };

const SECTIONS: Section[] = [
  {
    title: "LLM Providers",
    keys: [
      { key: "apikey_together", label: "Together.ai API Key", type: "password", placeholder: "sk-..." },
      { key: "apikey_anthropic", label: "Anthropic API Key", type: "password", placeholder: "sk-ant-..." },
      { key: "apikey_openai", label: "OpenAI API Key", type: "password", placeholder: "sk-..." },
    ],
  },
  {
    title: "Social Media APIs",
    keys: [
      { key: "apikey_novita", label: "Novita.ai API Key", type: "password" },
      { key: "apikey_shotstack", label: "Shotstack API Key", type: "password" },
      { key: "apikey_postiz_url", label: "Postiz URL", placeholder: "http://localhost:3000" },
      { key: "apikey_postiz", label: "Postiz API Key", type: "password" },
    ],
  },
  {
    title: "Hub Settings",
    keys: [
      { key: "hub_port", label: "Dashboard Port", placeholder: "3001" },
      { key: "upstream_sync_enabled", label: "Upstream sync (true/false)", placeholder: "true" },
    ],
  },
];

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => { setSettings(s); setEdits({}); }).catch(console.error);
  }, []);

  function set(key: string, value: string) {
    setEdits((e) => ({ ...e, [key]: value }));
  }

  function val(key: string): string {
    return edits[key] ?? settings[key] ?? "";
  }

  async function save() {
    setSaving(true);
    try {
      // Only save keys that were actually edited (and aren't masked)
      const toSave: Record<string, string> = {};
      for (const [k, v] of Object.entries(edits)) {
        if (v !== "••••••••") toSave[k] = v;
      }
      if (Object.keys(toSave).length > 0) {
        await api.saveSettings(toSave);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <PageTitle>Settings</PageTitle>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {saved && <span style={{ color: "#238636", fontSize: 13 }}>✓ Saved</span>}
          <Btn onClick={save} disabled={saving}>Save changes</Btn>
        </div>
      </div>

      {SECTIONS.map((section) => (
        <Card key={section.title} style={{ marginBottom: 16 }}>
          <CardTitle>{section.title}</CardTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {section.keys.map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "#8b949e", display: "block", marginBottom: 4 }}>{label}</label>
                <Input
                  value={val(key)}
                  onChange={(v) => set(key, v)}
                  placeholder={placeholder}
                  type={type}
                />
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card>
        <CardTitle>Upstream Sync</CardTitle>
        <p style={{ fontSize: 13, color: "#8b949e", lineHeight: 1.7 }}>
          To pull the latest OpenClaw updates:<br />
          <code style={{ background: "#0d1117", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
            git remote add upstream https://github.com/openclaw/openclaw.git && git fetch upstream main
          </code>
        </p>
        <p style={{ fontSize: 13, color: "#8b949e", marginTop: 12, lineHeight: 1.7 }}>
          To pull the latest Hermes Agent updates:<br />
          <code style={{ background: "#0d1117", padding: "2px 8px", borderRadius: 4, fontFamily: "monospace" }}>
            git remote add hermes https://github.com/nousresearch/hermes-agent.git && git fetch hermes main
          </code>
        </p>
        <p style={{ fontSize: 12, color: "#484f58", marginTop: 12 }}>
          Because Hub lives entirely in <code>extensions/hub/</code>, merging upstream changes to the root will never conflict with your custom code.
        </p>
      </Card>
    </div>
  );
}
