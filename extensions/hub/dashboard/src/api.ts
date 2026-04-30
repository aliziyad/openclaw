const BASE = "/api";

async function req<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API ${method} ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  // Onboarding
  getOnboarding: () => req<{ state: OnboardingState; steps: OnboardingStep[] }>("GET", "/onboarding"),
  advanceOnboarding: (body: { step?: string; key?: string; value?: string }) =>
    req("POST", "/onboarding/advance", body),
  completeOnboarding: () => req("POST", "/onboarding/complete", {}),

  // Overview
  getOverview: () => req<OverviewData>("GET", "/overview"),

  // Agents
  getAgents: () => req<Agent[]>("GET", "/agents"),
  saveAgent: (agent: Partial<Agent>) => req("POST", "/agents", agent),

  // Budget
  getBudget: () => req<BudgetEntry[]>("GET", "/budget"),
  getAgentBudget: (id: string) => req<AgentBudget>("GET", `/budget/${id}`),

  // Businesses
  getBusinesses: () => req<Business[]>("GET", "/businesses"),
  saveBusiness: (biz: Partial<Business>) => req("POST", "/businesses", biz),
  getBusinessSpend: (id: string) => req<{ data: DaySpend[] }>("GET", `/businesses/${id}/spend`),

  // Social
  getSocialPosts: () => req<SocialPost[]>("GET", "/social/posts"),
  runSocialWorkflow: (businessId: string, cfg?: Record<string, string>) =>
    req("POST", `/social/run/${businessId}`, cfg ?? {}),

  // Skills
  getSkills: () => req<Skill[]>("GET", "/skills"),
  saveSkill: (skill: Partial<Skill>) => req("POST", "/skills", skill),
  useSkill: (id: string, success = true) => req("POST", `/skills/${id}/use`, { success }),
  exportSkills: () => req("POST", "/skills/export", {}),

  // User model
  getUserModel: (agentId: string) => req<UserFact[]>("GET", `/user-model/${agentId}`),

  // MCP
  getMcpServers: () => req<McpServer[]>("GET", "/mcp/servers"),
  saveMcpServer: (srv: Partial<McpServer>) => req("POST", "/mcp/servers", srv),
  getMcpTools: () => req<McpTool[]>("GET", "/mcp/tools"),

  // Settings
  getSettings: () => req<Record<string, string>>("GET", "/settings"),
  saveSettings: (s: Record<string, string>) => req("POST", "/settings", s),

  // Health
  health: () => req<{ ok: boolean }>("GET", "/health"),
};

// ── Types ────────────────────────────────────────────────────────────────────
export type OnboardingState = {
  completed: boolean; step: string; agentName?: string;
  llmConfigured: boolean; socialConfigured: boolean; businessesAdded: boolean;
};
export type OnboardingStep = { id: string; title: string; description: string };

export type OverviewData = {
  agents: Agent[]; businesses: unknown[]; budget: BudgetEntry[]; skillsCount: number; postsToday: number;
};

export type Agent = {
  id: string; name: string; kind: string; model: string; endpoint?: string;
  monthly_budget_usd: number; active: number;
};

export type BudgetEntry = {
  id: string; name: string; budget: number; spent: number; remaining: number; pct: number; exceeded: boolean;
};
export type AgentBudget = { agentId: string; month: string; spent: number; budget: number };

export type Business = {
  id: string; name: string; description?: string; platforms: string[];
  topics: string[]; imagePrompts: string[]; videoTemplates: unknown[]; active: number;
};

export type SocialPost = {
  id: number; business_id: string; business_name?: string; platform: string;
  content: string; status: string; scheduled_at?: number; posted_at?: number;
};

export type DaySpend = { day: string; total: number };

export type Skill = {
  id: string; name: string; description: string; content: string;
  source: string; tags: string[]; useCount: number; successCount: number; createdAt: number;
};

export type UserFact = { kind: string; key: string; value: string; confidence: number };

export type McpServer = {
  id: string; name: string; transport: string; command?: string; url?: string; enabled: number;
};
export type McpTool = { name: string; description: string; inputSchema: unknown };
