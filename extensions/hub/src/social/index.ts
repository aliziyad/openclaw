import type { HubDb } from "../db.js";
import { recordCost, estimateCost } from "../budget.js";
import { generateSocialPosts, type Platform, type SocialPostSet } from "./llm.js";
import { generateImages } from "./images.js";
import { renderVideos } from "./videos.js";
import { buildSchedule, scheduleAll } from "./scheduler.js";

export type BusinessConfig = {
  id: string;
  name: string;
  topics: string[];
  platforms: Platform[];
  imagePrompts: string[];
  videoTemplates: Array<{ backgroundClip: string; headline: string }>;
};

export type SocialRunConfig = {
  togetherApiKey: string;
  novitaApiKey: string;
  shotstackApiKey: string;
  postizBaseUrl: string;
  postizApiKey?: string;
  llmModel?: string;
};

export type SocialRunResult = {
  businessId: string;
  posts: SocialPostSet;
  imageUrls: string[];
  videoRenderIds: string[];
  scheduled: number;
  errors: string[];
};

export async function runDailyWorkflow(
  business: BusinessConfig,
  config: SocialRunConfig,
  db: HubDb,
): Promise<SocialRunResult> {
  const errors: string[] = [];
  let posts: SocialPostSet = {} as SocialPostSet;
  const imageUrls: string[] = [];
  const videoRenderIds: string[] = [];

  // 1. Generate text posts
  try {
    posts = await generateSocialPosts(business.topics, business.platforms, {
      apiKey: config.togetherApiKey,
      model: config.llmModel,
    });
    // Record approximate cost (50 topics, ~1k tokens in + ~2k out per call)
    recordCost(db, {
      agentId: "hub-social",
      businessId: business.id,
      provider: "together.ai",
      model: config.llmModel ?? "meta-llama/Llama-3-3-70b-instruct",
      inputTokens: 1000,
      outputTokens: 2000,
      costUsd: estimateCost("meta-llama/Llama-3-3-70b-instruct", 1000, 2000),
    });
  } catch (e) {
    errors.push(`Text generation failed: ${String(e)}`);
  }

  // 2. Generate images
  if (business.imagePrompts.length > 0) {
    try {
      const images = await generateImages(business.imagePrompts, { apiKey: config.novitaApiKey });
      imageUrls.push(...images.map((i) => i.url));
      recordCost(db, {
        agentId: "hub-social",
        businessId: business.id,
        provider: "novita.ai",
        model: "sdxl",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: business.imagePrompts.length * 0.0015,
      });
    } catch (e) {
      errors.push(`Image generation failed: ${String(e)}`);
    }
  }

  // 3. Render videos
  if (business.videoTemplates.length > 0) {
    try {
      const videos = await renderVideos(business.videoTemplates, {
        apiKey: config.shotstackApiKey,
      });
      videoRenderIds.push(...videos.map((v) => v.renderId));
      recordCost(db, {
        agentId: "hub-social",
        businessId: business.id,
        provider: "shotstack",
        model: "template",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: business.videoTemplates.length * 0.02,
      });
    } catch (e) {
      errors.push(`Video rendering failed: ${String(e)}`);
    }
  }

  // 4. Schedule all posts via Postiz
  let scheduledCount = 0;
  if (config.postizBaseUrl) {
    try {
      const today = new Date();
      const allPosts = business.platforms.flatMap((platform) => {
        const platformPosts = posts[platform] ?? [];
        return platformPosts.map((content) => ({ platform, content }));
      });

      const scheduled = buildSchedule(allPosts, today);
      const results = await scheduleAll(scheduled, {
        baseUrl: config.postizBaseUrl,
        apiKey: config.postizApiKey,
      });
      scheduledCount = results.filter((r) => r.id !== "").length;

      // Log to DB
      const stmt = db.prepare(`
        INSERT INTO social_posts (business_id, platform, content, media_urls, scheduled_at, status, postiz_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const r of results) {
        stmt.run(
          business.id,
          r.post.platform,
          r.post.content,
          JSON.stringify(r.post.mediaUrls ?? []),
          r.post.scheduledAt ? Math.floor(new Date(r.post.scheduledAt).getTime() / 1000) : null,
          r.id ? "scheduled" : "error",
          r.id || null,
        );
      }
    } catch (e) {
      errors.push(`Postiz scheduling failed: ${String(e)}`);
    }
  }

  return {
    businessId: business.id,
    posts,
    imageUrls,
    videoRenderIds,
    scheduled: scheduledCount,
    errors,
  };
}

export function getBusinessFromDb(db: HubDb, id: string): BusinessConfig | undefined {
  const row = db.prepare(`SELECT * FROM businesses WHERE id = ?`).get(id) as
    | Record<string, unknown>
    | undefined;
  if (!row) return undefined;
  return {
    id: row.id as string,
    name: row.name as string,
    topics: JSON.parse(row.topics as string),
    platforms: JSON.parse(row.platforms as string),
    imagePrompts: JSON.parse(row.image_prompts as string),
    videoTemplates: JSON.parse(row.video_templates as string),
  };
}
