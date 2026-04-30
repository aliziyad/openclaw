import { useEffect, useState } from "react";
import { api, type Business, type SocialPost } from "../api.ts";
import { Card, CardTitle, PageTitle, Badge, Btn } from "../components/Card.tsx";

const PLATFORM_COLORS: Record<string, string> = {
  twitter: "#1d9bf0", instagram: "#e1306c", facebook: "#1877f2",
  youtube: "#ff0000", tiktok: "#69c9d0",
};

export default function Social() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    api.getBusinesses().then(setBusinesses).catch(console.error);
    api.getSocialPosts().then(setPosts).catch(console.error);
    const id = setInterval(() => api.getSocialPosts().then(setPosts).catch(() => {}), 15000);
    return () => clearInterval(id);
  }, []);

  async function runWorkflow(bizId: string) {
    setRunning(bizId);
    try {
      await api.runSocialWorkflow(bizId);
    } finally {
      setRunning(null);
      setTimeout(() => api.getSocialPosts().then(setPosts), 2000);
    }
  }

  const byStatus = (status: string) => posts.filter((p) => p.status === status);

  return (
    <div>
      <PageTitle>Social Media</PageTitle>

      <Card style={{ marginBottom: 24 }}>
        <CardTitle>Run Daily Workflow</CardTitle>
        <p style={{ fontSize: 13, color: "#8b949e", marginBottom: 16 }}>
          Generates 5 posts per platform, 3 images (Novita.ai), and 2 videos (Shotstack), then schedules everything via Postiz.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {businesses.map((b) => (
            <Btn key={b.id} onClick={() => runWorkflow(b.id)} disabled={running === b.id}>
              {running === b.id ? "Running…" : `▶ Run ${b.name}`}
            </Btn>
          ))}
          {businesses.length === 0 && (
            <span style={{ fontSize: 13, color: "#484f58" }}>Add businesses first.</span>
          )}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Scheduled", posts: byStatus("scheduled"), color: "#1f6feb" },
          { label: "Errors", posts: byStatus("error"), color: "#f85149" },
        ].map(({ label, posts: p, color }) => (
          <Card key={label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <CardTitle>{label}</CardTitle>
              <Badge color={color}>{p.length}</Badge>
            </div>
            {p.slice(0, 3).map((post) => (
              <div key={post.id} style={{ borderTop: "1px solid #21262d", padding: "8px 0", fontSize: 12 }}>
                <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                  <Badge color={PLATFORM_COLORS[post.platform] ?? "#8b949e"}>{post.platform}</Badge>
                  {post.business_name && <span style={{ color: "#484f58" }}>{post.business_name}</span>}
                </div>
                <div style={{ color: "#8b949e", lineHeight: 1.4 }}>
                  {post.content.slice(0, 120)}{post.content.length > 120 ? "…" : ""}
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle>Recent Posts</CardTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ color: "#8b949e", textAlign: "left" }}>
              <th style={{ paddingBottom: 8 }}>Platform</th>
              <th style={{ paddingBottom: 8 }}>Business</th>
              <th style={{ paddingBottom: 8 }}>Content</th>
              <th style={{ paddingBottom: 8 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {posts.slice(0, 20).map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #21262d" }}>
                <td style={{ padding: "6px 0" }}>
                  <Badge color={PLATFORM_COLORS[p.platform] ?? "#8b949e"}>{p.platform}</Badge>
                </td>
                <td style={{ padding: "6px 0", color: "#8b949e" }}>{p.business_name ?? p.business_id}</td>
                <td style={{ padding: "6px 0", color: "#c9d1d9", maxWidth: 360 }}>
                  {p.content.slice(0, 80)}{p.content.length > 80 ? "…" : ""}
                </td>
                <td style={{ padding: "6px 0" }}>
                  <Badge color={p.status === "scheduled" ? "#238636" : p.status === "error" ? "#f85149" : "#8b949e"}>
                    {p.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={4} style={{ padding: "12px 0", color: "#484f58" }}>No posts yet. Run a workflow above.</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
