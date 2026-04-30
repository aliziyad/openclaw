import type { ReactNode, CSSProperties } from "react";

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        background: "#161b22", border: "1px solid #21262d", borderRadius: 10,
        padding: "20px 24px", ...style,
      }}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: "#8b949e", marginBottom: 16, textTransform: "uppercase", letterSpacing: 0.5 }}>{children}</div>;
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f0f6fc", marginBottom: 24 }}>{children}</h1>;
}

export function Badge({ children, color = "#1f6feb" }: { children: ReactNode; color?: string }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, fontSize: 11, padding: "2px 6px", fontWeight: 600,
    }}>
      {children}
    </span>
  );
}

export function BudgetBar({ pct, exceeded }: { pct: number; exceeded: boolean }) {
  const fill = exceeded ? "#f85149" : pct > 80 ? "#d29922" : "#238636";
  return (
    <div style={{ background: "#21262d", borderRadius: 4, height: 6, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: fill, transition: "width .3s" }} />
    </div>
  );
}

export function Grid({ children, cols = 3 }: { children: ReactNode; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {children}
    </div>
  );
}

export function Btn({
  children, onClick, variant = "primary", disabled,
}: {
  children: ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "danger"; disabled?: boolean;
}) {
  const colors = {
    primary: { bg: "#238636", color: "#fff", border: "#2ea043" },
    secondary: { bg: "#21262d", color: "#c9d1d9", border: "#30363d" },
    danger: { bg: "#da3633", color: "#fff", border: "#f85149" },
  };
  const c = colors[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: c.bg, color: c.color, border: `1px solid ${c.border}`,
        borderRadius: 6, padding: "6px 14px", fontSize: 13, fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

export function Input({
  value, onChange, placeholder, type = "text", style,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: "#0d1117", border: "1px solid #30363d", borderRadius: 6,
        color: "#c9d1d9", padding: "6px 10px", fontSize: 13, width: "100%", ...style,
      }}
    />
  );
}
