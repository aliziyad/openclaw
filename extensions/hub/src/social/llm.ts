export type Platform = "twitter" | "instagram" | "facebook" | "youtube" | "tiktok";

export type SocialPostSet = Record<Platform, string[]>;

export type LlmConfig = {
  apiKey: string;
  baseUrl?: string;
  model?: string;
};

const SYSTEM_PROMPT =
  "You are an expert social media manager. You write engaging, platform-specific posts that avoid promotional spam. Output **only valid JSON**.";

function buildUserPrompt(topics: string[], platforms: Platform[]): string {
  const platformInstructions: Record<Platform, string> = {
    twitter: "≤280 characters, 1–2 hashtags, conversational",
    instagram: "150–220 characters + 5 hashtags, emojis allowed",
    facebook: "80–120 characters, question to encourage comments",
    youtube: "200–300 characters, include 2 relevant hashtags and a call to action",
    tiktok: "15–25 second script, hook in first 3 seconds, use 'you' and imperatives",
  };

  const specs = platforms.map((p) => `- ${p}: ${platformInstructions[p]}`).join("\n");
  const keys = platforms.map((p) => `"${p}": ["post1", "post2", "post3", "post4", "post5"]`).join(",\n  ");

  return `Generate 5 text posts for each of these platforms: ${platforms.join(", ")}.

Topics for today: ${topics.join(", ")}

Requirements per platform:
${specs}

Output JSON format exactly:
{
  ${keys}
}`;
}

export async function generateSocialPosts(
  topics: string[],
  platforms: Platform[],
  config: LlmConfig,
): Promise<SocialPostSet> {
  const baseUrl = config.baseUrl ?? "https://api.together.ai/v1";
  const model = config.model ?? "meta-llama/Llama-3-3-70b-instruct";

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(topics, platforms) },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = data.choices[0]?.message?.content ?? "{}";
  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  return JSON.parse(cleaned) as SocialPostSet;
}
