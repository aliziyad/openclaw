import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { api } from "./api.ts";
import Layout from "./components/Layout.tsx";
import Overview from "./pages/Overview.tsx";
import Agents from "./pages/Agents.tsx";
import Businesses from "./pages/Businesses.tsx";
import Budget from "./pages/Budget.tsx";
import Social from "./pages/Social.tsx";
import Skills from "./pages/Skills.tsx";
import Mcp from "./pages/Mcp.tsx";
import Settings from "./pages/Settings.tsx";
import Onboarding from "./pages/Onboarding.tsx";

export default function App() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    api.getOnboarding().then((d) => setOnboardingDone(d.state.completed)).catch(() => setOnboardingDone(true));
  }, []);

  if (onboardingDone === null) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <span style={{ color: "#94a3b8", fontSize: 16 }}>Loading Hub…</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!onboardingDone && (
          <Route path="/onboarding" element={<Onboarding onComplete={() => setOnboardingDone(true)} />} />
        )}
        {!onboardingDone && <Route path="*" element={<Navigate to="/onboarding" replace />} />}
        {onboardingDone && (
          <Route path="/" element={<Layout />}>
            <Route index element={<Overview />} />
            <Route path="agents" element={<Agents />} />
            <Route path="businesses" element={<Businesses />} />
            <Route path="budget" element={<Budget />} />
            <Route path="social" element={<Social />} />
            <Route path="skills" element={<Skills />} />
            <Route path="mcp" element={<Mcp />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        )}
      </Routes>
    </BrowserRouter>
  );
}
