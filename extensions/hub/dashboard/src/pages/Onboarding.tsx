import { useEffect, useState } from "react";
import { api, type OnboardingState, type OnboardingStep } from "../api.ts";
import { Btn, Input } from "../components/Card.tsx";

const S: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0d1117" },
  box: { background: "#161b22", border: "1px solid #21262d", borderRadius: 12, padding: "40px 48px", maxWidth: 520, width: "100%" },
  steps: { display: "flex", gap: 8, marginBottom: 32 },
  dot: (active: boolean, done: boolean): React.CSSProperties => ({
    width: 8, height: 8, borderRadius: "50%",
    background: done ? "#238636" : active ? "#1f6feb" : "#21262d",
  }),
  title: { fontSize: 22, fontWeight: 700, color: "#f0f6fc", marginBottom: 8 },
  desc: { fontSize: 14, color: "#8b949e", marginBottom: 28, lineHeight: 1.6 },
  label: { fontSize: 13, color: "#8b949e", marginBottom: 6, display: "block" },
  field: { marginBottom: 16 },
  row: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 24 },
};

const STEPS = ["welcome", "agent", "businesses", "social", "budget", "done"];

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [state, setState] = useState<OnboardingState | null>(null);
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [agentName, setAgentName] = useState("");
  const [bizName, setBizName] = useState("");
  const [bizTopics, setBizTopics] = useState("");
  const [togetherKey, setTogetherKey] = useState("");
  const [novitaKey, setNovitaKey] = useState("");
  const [shotstackKey, setShotstackKey] = useState("");
  const [postizUrl, setPostizUrl] = useState("http://localhost:3000");
  const [budget, setBudget] = useState("20");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getOnboarding().then((d) => { setState(d.state); setSteps(d.steps); });
  }, []);

  if (!state) return null;

  const currentIdx = STEPS.indexOf(state.step);
  const stepInfo = steps.find((s) => s.id === state.step);

  async function advance(nextStep: string, extras?: Record<string, string>) {
    setSaving(true);
    try {
      if (extras) {
        for (const [k, v] of Object.entries(extras)) {
          await api.advanceOnboarding({ key: k, value: v });
        }
      }
      await api.advanceOnboarding({ step: nextStep });
      const d = await api.getOnboarding();
      setState(d.state);
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setSaving(true);
    try {
      await api.completeOnboarding();
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  async function handleWelcome() { await advance("agent"); }

  async function handleAgent() {
    if (!agentName.trim()) return;
    await api.saveAgent({ id: "default", name: agentName, kind: "openclaw", monthlyBudgetUsd: Number(budget) || 20 });
    await advance("businesses", { agent_name: agentName, llm_configured: "true" });
  }

  async function handleBusinesses() {
    if (!bizName.trim()) return;
    await api.saveBusiness({
      name: bizName,
      topics: bizTopics.split(",").map((t) => t.trim()).filter(Boolean),
      platforms: ["twitter", "instagram", "facebook"],
    });
    await advance("social", { businesses_added: "true" });
  }

  async function handleSocial() {
    await api.saveSettings({
      apikey_together: togetherKey,
      apikey_novita: novitaKey,
      apikey_shotstack: shotstackKey,
      apikey_postiz_url: postizUrl,
    });
    await advance("budget", { social_configured: "true" });
  }

  async function handleBudget() {
    await advance("done");
  }

  return (
    <div style={S.wrap}>
      <div style={S.box}>
        {/* Progress dots */}
        <div style={S.steps}>
          {STEPS.filter((s) => s !== "done").map((s, i) => (
            <div key={s} style={S.dot(s === state.step, i < currentIdx)} />
          ))}
        </div>

        <div style={S.title}>{stepInfo?.title ?? "Setup"}</div>
        <div style={S.desc}>{stepInfo?.description}</div>

        {state.step === "welcome" && (
          <>
            <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Hub is your operations dashboard for OpenClaw. It combines Paperclip-style
              multi-agent orchestration with Hermes self-improving skills — all on your own server.
            </p>
            <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.7 }}>
              You'll be up and running in about 2 minutes.
            </p>
            <div style={S.row}><Btn onClick={handleWelcome}>Get started →</Btn></div>
          </>
        )}

        {state.step === "agent" && (
          <>
            <div style={S.field}>
              <label style={S.label}>Agent name</label>
              <Input value={agentName} onChange={setAgentName} placeholder="e.g. Molty" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Monthly budget (USD)</label>
              <Input value={budget} onChange={setBudget} type="number" placeholder="20" />
            </div>
            <div style={S.row}>
              <Btn variant="secondary" onClick={() => advance("welcome")} disabled={saving}>Back</Btn>
              <Btn onClick={handleAgent} disabled={saving || !agentName.trim()}>Next →</Btn>
            </div>
          </>
        )}

        {state.step === "businesses" && (
          <>
            <div style={S.field}>
              <label style={S.label}>Business name</label>
              <Input value={bizName} onChange={setBizName} placeholder="e.g. Fit Life Studio" />
            </div>
            <div style={S.field}>
              <label style={S.label}>Topics (comma-separated)</label>
              <Input value={bizTopics} onChange={setBizTopics} placeholder="protein snacks, leg day, recovery" />
            </div>
            <p style={{ color: "#484f58", fontSize: 12, marginTop: 8 }}>You can add more businesses after setup.</p>
            <div style={S.row}>
              <Btn variant="secondary" onClick={() => advance("agent")} disabled={saving}>Back</Btn>
              <Btn onClick={handleBusinesses} disabled={saving || !bizName.trim()}>Next →</Btn>
            </div>
          </>
        )}

        {state.step === "social" && (
          <>
            {[
              ["Together.ai API Key", togetherKey, setTogetherKey, "sk-..."],
              ["Novita.ai API Key", novitaKey, setNovitaKey, "nvt-..."],
              ["Shotstack API Key", shotstackKey, setShotstackKey, "ssk-..."],
              ["Postiz URL", postizUrl, setPostizUrl, "http://localhost:3000"],
            ].map(([label, val, set, ph]) => (
              <div key={label as string} style={S.field}>
                <label style={S.label}>{label as string}</label>
                <Input value={val as string} onChange={set as (v: string) => void} placeholder={ph as string} type={label !== "Postiz URL" ? "password" : "text"} />
              </div>
            ))}
            <p style={{ color: "#484f58", fontSize: 12 }}>All keys are stored locally. You can skip this and add keys in Settings later.</p>
            <div style={S.row}>
              <Btn variant="secondary" onClick={() => advance("businesses")} disabled={saving}>Back</Btn>
              <Btn variant="secondary" onClick={() => advance("budget")} disabled={saving}>Skip</Btn>
              <Btn onClick={handleSocial} disabled={saving}>Next →</Btn>
            </div>
          </>
        )}

        {state.step === "budget" && (
          <>
            <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Hub tracks every API call cost and enforces your monthly budget limit per agent.
              You set the limit during agent setup — you can always change it in Settings.
            </p>
            <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.7 }}>
              When an agent reaches its budget, Hub logs a warning and you can choose to pause it or increase the limit.
            </p>
            <div style={S.row}>
              <Btn variant="secondary" onClick={() => advance("social")} disabled={saving}>Back</Btn>
              <Btn onClick={handleBudget} disabled={saving}>Next →</Btn>
            </div>
          </>
        )}

        {state.step === "done" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🦞</div>
            <p style={{ color: "#8b949e", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Hub is ready. Your OpenClaw agent is set up, social media workflows are configured,
              and budget tracking is live.
            </p>
            <div style={S.row}><Btn onClick={finish} disabled={saving}>Open dashboard →</Btn></div>
          </>
        )}
      </div>
    </div>
  );
}
