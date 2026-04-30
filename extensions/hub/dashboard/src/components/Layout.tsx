import { Outlet, NavLink } from "react-router-dom";

const S: Record<string, React.CSSProperties> = {
  shell: { display: "flex", height: "100vh", overflow: "hidden" },
  sidebar: {
    width: 220, background: "#161b22", borderRight: "1px solid #21262d",
    display: "flex", flexDirection: "column", padding: "16px 0", flexShrink: 0,
  },
  logo: { padding: "0 20px 20px", fontSize: 18, fontWeight: 700, color: "#f0f6fc", letterSpacing: -0.5 },
  sub: { fontSize: 11, color: "#8b949e", fontWeight: 400 },
  nav: { flex: 1, display: "flex", flexDirection: "column", gap: 2, padding: "0 8px" },
  main: { flex: 1, overflow: "auto", padding: 32 },
};

type NavItem = { to: string; label: string; icon: string };

const items: NavItem[] = [
  { to: "/", label: "Overview", icon: "◈" },
  { to: "/agents", label: "Agents", icon: "⬡" },
  { to: "/businesses", label: "Businesses", icon: "⊞" },
  { to: "/budget", label: "Budget", icon: "◉" },
  { to: "/social", label: "Social Media", icon: "↗" },
  { to: "/skills", label: "Skills", icon: "✦" },
  { to: "/mcp", label: "MCP", icon: "⬡" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

function linkStyle(active: boolean): React.CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
    borderRadius: 6, fontSize: 13, fontWeight: 500, textDecoration: "none",
    color: active ? "#f0f6fc" : "#8b949e",
    background: active ? "#21262d" : "transparent",
    transition: "all .15s",
  };
}

export default function Layout() {
  return (
    <div style={S.shell}>
      <nav style={S.sidebar}>
        <div style={S.logo}>
          Hub <span style={S.sub}>by OpenClaw</span>
        </div>
        <div style={S.nav}>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              style={({ isActive }) => linkStyle(isActive)}
            >
              <span style={{ width: 16, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>
        <div style={{ padding: "12px 20px", fontSize: 11, color: "#484f58" }}>
          Hub v1.0 · OpenClaw 2026.2.4
        </div>
      </nav>
      <main style={S.main}>
        <Outlet />
      </main>
    </div>
  );
}
