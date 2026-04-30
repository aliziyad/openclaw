export type ImageResult = { url: string; prompt: string };

export type NovitaConfig = { apiKey: string };

export async function generateImage(prompt: string, config: NovitaConfig): Promise<ImageResult> {
  const response = await fetch("https://api.novita.ai/v3/async/txt2img", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model_name: "sd_xl_base_1.0.safetensors",
      prompt,
      width: 1024,
      height: 1024,
      steps: 20,
      image_num: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`Novita API error ${response.status}: ${await response.text()}`);
  }

  const job = (await response.json()) as { task_id: string };

  // Poll for result (Novita uses async job pattern)
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const poll = await fetch(`https://api.novita.ai/v3/async/task-result?task_id=${job.task_id}`, {
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    const result = (await poll.json()) as {
      task: { status: string };
      images?: Array<{ image_url: string }>;
    };
    if (result.task.status === "TASK_STATUS_SUCCEED" && result.images?.[0]) {
      return { url: result.images[0].image_url, prompt };
    }
    if (result.task.status === "TASK_STATUS_FAILED") {
      throw new Error(`Novita image generation failed for prompt: ${prompt}`);
    }
  }

  throw new Error(`Novita image generation timed out for prompt: ${prompt}`);
}

export async function generateImages(
  prompts: string[],
  config: NovitaConfig,
): Promise<ImageResult[]> {
  // Generate in parallel (respects Novita rate limits via Promise.all)
  return Promise.all(prompts.map((p) => generateImage(p, config)));
}
