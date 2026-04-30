export type VideoTemplate = {
  backgroundClip: string;
  headline: string;
  style?: { color?: string; position?: string };
};

export type VideoResult = { renderId: string; url?: string };

export type ShotstackConfig = { apiKey: string; env?: "v1" | "stage" };

export function buildShotstackPayload(template: VideoTemplate) {
  return {
    timeline: {
      background: template.backgroundClip,
      tracks: [
        {
          clips: [
            {
              asset: {
                type: "title",
                text: template.headline,
                style: "future",
                color: template.style?.color ?? "#FFFFFF",
                size: "large",
              },
              start: 0,
              length: 15,
              position: template.style?.position ?? "center",
            },
          ],
        },
      ],
    },
    output: {
      format: "mp4",
      resolution: "hd",
    },
  };
}

export async function renderVideo(
  template: VideoTemplate,
  config: ShotstackConfig,
): Promise<VideoResult> {
  const env = config.env ?? "v1";
  const response = await fetch(`https://api.shotstack.io/${env}/render`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
    },
    body: JSON.stringify(buildShotstackPayload(template)),
  });

  if (!response.ok) {
    throw new Error(`Shotstack API error ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as { response: { id: string } };
  const renderId = data.response.id;

  // Poll for completion
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const poll = await fetch(`https://api.shotstack.io/${env}/render/${renderId}`, {
      headers: { "x-api-key": config.apiKey },
    });
    const status = (await poll.json()) as {
      response: { status: string; url?: string };
    };
    if (status.response.status === "done") {
      return { renderId, url: status.response.url };
    }
    if (status.response.status === "failed") {
      throw new Error(`Shotstack render failed: ${renderId}`);
    }
  }

  return { renderId }; // Return without URL if timeout; caller can poll later
}

export async function renderVideos(
  templates: VideoTemplate[],
  config: ShotstackConfig,
): Promise<VideoResult[]> {
  return Promise.all(templates.map((t) => renderVideo(t, config)));
}
