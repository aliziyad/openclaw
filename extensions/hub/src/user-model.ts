import type { HubDb } from "./db.js";

export type UserFact = {
  kind: "preference" | "fact" | "goal" | "style" | "context";
  key: string;
  value: string;
  confidence: number;
};

// Extract preferences and facts from a message exchange.
// In production this would call the LLM; here we use pattern matching
// as a lightweight baseline that runs without an extra API call.
export function extractFacts(userMessage: string, assistantReply: string): UserFact[] {
  const facts: UserFact[] = [];
  const msg = userMessage.toLowerCase();

  // Communication style preferences
  if (/(keep it short|be brief|concise|tldr)/i.test(msg)) {
    facts.push({ kind: "preference", key: "response_length", value: "brief", confidence: 0.9 });
  }
  if (/(detailed|thorough|explain everything|step by step)/i.test(msg)) {
    facts.push({ kind: "preference", key: "response_length", value: "detailed", confidence: 0.9 });
  }
  if (/(no emojis|don't use emoji)/i.test(msg)) {
    facts.push({ kind: "preference", key: "emojis", value: "disabled", confidence: 0.95 });
  }
  if (/(use emojis|add emojis)/i.test(msg)) {
    facts.push({ kind: "preference", key: "emojis", value: "enabled", confidence: 0.9 });
  }

  // Language / locale
  const langMatch = /(?:reply|respond|answer) in (\w+)/i.exec(msg);
  if (langMatch) {
    facts.push({ kind: "preference", key: "language", value: langMatch[1].toLowerCase(), confidence: 0.9 });
  }

  // Domain interests
  const topics = ["fitness", "coding", "finance", "marketing", "design", "ai", "travel", "food"];
  for (const topic of topics) {
    if (msg.includes(topic)) {
      facts.push({ kind: "fact", key: `interest_${topic}`, value: "true", confidence: 0.7 });
    }
  }

  // Frustration signals → note for context injection
  if (/(didn't work|wrong|incorrect|bad answer|try again)/i.test(msg)) {
    facts.push({ kind: "context", key: "last_attempt_failed", value: "true", confidence: 0.85 });
  }

  return facts;
}

export function upsertFacts(db: HubDb, agentId: string, facts: UserFact[]): void {
  const stmt = db.prepare(`
    INSERT INTO user_model (agent_id, kind, key, value, confidence, updated_at)
    VALUES (?, ?, ?, ?, ?, unixepoch())
    ON CONFLICT(agent_id, kind, key) DO UPDATE SET
      value = excluded.value,
      confidence = excluded.confidence,
      updated_at = unixepoch()
  `);
  for (const f of facts) {
    stmt.run(agentId, f.kind, f.key, f.value, f.confidence);
  }
}

export function getUserModel(db: HubDb, agentId: string): UserFact[] {
  return (
    db
      .prepare(`SELECT kind, key, value, confidence FROM user_model WHERE agent_id = ? ORDER BY updated_at DESC`)
      .all(agentId) as UserFact[]
  );
}

// Build a short context string to prepend to system prompts
export function buildUserContext(db: HubDb, agentId: string): string {
  const facts = getUserModel(db, agentId);
  if (facts.length === 0) return "";

  const prefs = facts
    .filter((f) => f.kind === "preference")
    .map((f) => `- ${f.key}: ${f.value}`)
    .join("\n");

  if (!prefs) return "";

  return `\n\n[User preferences learned over time:\n${prefs}]`;
}
