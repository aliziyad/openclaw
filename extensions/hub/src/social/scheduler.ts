export type PostizConfig = { baseUrl: string; apiKey?: string };

export type ScheduledPost = {
  platform: string;
  content: string;
  mediaUrls?: string[];
  scheduledAt: string; // ISO 8601
};

export type PostizResult = { id: string; status: string };

export async function schedulePost(
  post: ScheduledPost,
  config: PostizConfig,
): Promise<PostizResult> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${config.baseUrl}/api/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      platform: post.platform,
      content: post.content,
      mediaUrls: post.mediaUrls ?? [],
      scheduledAt: post.scheduledAt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Postiz error ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as PostizResult;
}

// Distribute posts evenly through the day starting at baseHour UTC
export function buildSchedule(
  posts: ScheduledPost[],
  baseDate: Date,
  baseHour = 9,
): ScheduledPost[] {
  const gapMinutes = posts.length > 0 ? Math.floor((14 * 60) / posts.length) : 60;
  return posts.map((post, i) => {
    const d = new Date(baseDate);
    d.setUTCHours(baseHour, 0, 0, 0);
    d.setUTCMinutes(d.getUTCMinutes() + i * gapMinutes);
    return { ...post, scheduledAt: d.toISOString() };
  });
}

export async function scheduleAll(
  posts: ScheduledPost[],
  config: PostizConfig,
): Promise<Array<PostizResult & { post: ScheduledPost }>> {
  const results: Array<PostizResult & { post: ScheduledPost }> = [];
  for (const post of posts) {
    try {
      const result = await schedulePost(post, config);
      results.push({ ...result, post });
    } catch (e) {
      results.push({ id: "", status: `error: ${String(e)}`, post });
    }
  }
  return results;
}
