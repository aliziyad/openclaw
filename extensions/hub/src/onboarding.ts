import type { HubDb } from "./db.js";

export type OnboardingState = {
  completed: boolean;
  step: string;
  agentName?: string;
  llmConfigured: boolean;
  socialConfigured: boolean;
  businessesAdded: boolean;
  firstRunAt?: number;
};

export function getOnboardingState(db: HubDb): OnboardingState {
  const get = (key: string) => {
    const row = db.prepare(`SELECT value FROM onboarding WHERE key = ?`).get(key) as
      | { value: string }
      | undefined;
    return row?.value;
  };

  const completed = get("completed") === "true";
  const step = get("step") ?? "welcome";
  const firstRunAt = get("first_run_at") ? Number(get("first_run_at")) : undefined;

  if (!firstRunAt) {
    // Mark first run
    db.prepare(`INSERT OR IGNORE INTO onboarding (key, value) VALUES ('first_run_at', ?)`).run(
      String(Math.floor(Date.now() / 1000)),
    );
  }

  return {
    completed,
    step,
    agentName: get("agent_name"),
    llmConfigured: get("llm_configured") === "true",
    socialConfigured: get("social_configured") === "true",
    businessesAdded: get("businesses_added") === "true",
    firstRunAt: firstRunAt ?? Math.floor(Date.now() / 1000),
  };
}

export function setOnboardingKey(db: HubDb, key: string, value: string): void {
  db.prepare(`
    INSERT INTO onboarding (key, value, updated_at) VALUES (?, ?, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = unixepoch()
  `).run(key, value);
}

export function advanceOnboardingStep(db: HubDb, step: string): void {
  setOnboardingKey(db, "step", step);
}

export function completeOnboarding(db: HubDb): void {
  setOnboardingKey(db, "completed", "true");
  setOnboardingKey(db, "step", "done");
}

export const ONBOARDING_STEPS = [
  { id: "welcome", title: "Welcome to Hub", description: "Set up your Hub in under 5 minutes." },
  {
    id: "agent",
    title: "Name your agent",
    description: "Give your OpenClaw agent a name and configure its LLM provider.",
  },
  {
    id: "businesses",
    title: "Add your businesses",
    description: "Add up to 3 businesses for social media automation.",
  },
  {
    id: "social",
    title: "Connect social platforms",
    description: "Configure Together.ai, Novita.ai, Shotstack, and Postiz API keys.",
  },
  {
    id: "budget",
    title: "Set budgets",
    description: "Set monthly spend limits per agent to keep costs in check.",
  },
  { id: "done", title: "All set!", description: "Hub is ready. Your dashboard is live." },
];
