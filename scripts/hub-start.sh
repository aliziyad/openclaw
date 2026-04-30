#!/usr/bin/env bash
# Hub startup script — builds dashboard and launches everything
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."

info()  { echo "[hub] $*"; }
warn()  { echo "[hub] WARN: $*" >&2; }
error() { echo "[hub] ERROR: $*" >&2; exit 1; }

# ── 1. Build dashboard if dist/ missing or stale ─────────────────────────────
DASHBOARD_DIR="$ROOT/extensions/hub/dashboard"
DIST_DIR="$DASHBOARD_DIR/dist"

if [ ! -d "$DIST_DIR" ] || [ "$DASHBOARD_DIR/src" -nt "$DIST_DIR/index.html" ] 2>/dev/null; then
  info "Building Hub dashboard…"
  if ! command -v pnpm &>/dev/null; then
    warn "pnpm not found — trying npm"
    PKG_MGR="npm"
  else
    PKG_MGR="pnpm"
  fi
  cd "$DASHBOARD_DIR"
  $PKG_MGR install --silent 2>/dev/null || true
  $PKG_MGR run build
  cd "$ROOT"
  info "Dashboard built at $DIST_DIR"
else
  info "Dashboard already built — skipping build"
fi

# ── 2. Ensure the Hub extension is in openclaw.json ──────────────────────────
OPENCLAW_JSON="$ROOT/openclaw.json"
if [ -f "$OPENCLAW_JSON" ]; then
  if ! grep -q '"@openclaw/hub"' "$OPENCLAW_JSON" 2>/dev/null; then
    info "Registering Hub extension in openclaw.json…"
    # Use node to safely patch the JSON
    node -e "
      const fs = require('fs');
      const cfg = JSON.parse(fs.readFileSync('$OPENCLAW_JSON', 'utf8'));
      cfg.extensions = cfg.extensions || [];
      if (!cfg.extensions.includes('./extensions/hub/index.ts')) {
        cfg.extensions.push('./extensions/hub/index.ts');
      }
      fs.writeFileSync('$OPENCLAW_JSON', JSON.stringify(cfg, null, 2));
    "
    info "Hub extension registered"
  fi
fi

# ── 3. Docker compose (if --docker flag) ─────────────────────────────────────
if [[ "${1:-}" == "--docker" ]]; then
  info "Starting full Docker stack (OpenClaw + Postiz + n8n + Postgres + Redis)…"
  cd "$ROOT"
  docker compose -f docker-compose.hub.yml up -d
  echo ""
  echo "  Hub Dashboard:  http://localhost:${HUB_DASHBOARD_PORT:-3001}"
  echo "  Postiz:         http://localhost:${POSTIZ_PORT:-3000}"
  echo "  n8n:            http://localhost:${N8N_PORT:-5678}"
  echo "  OpenClaw WS:    ws://localhost:${OPENCLAW_GATEWAY_PORT:-18789}"
  echo ""
  info "All services started."
  exit 0
fi

# ── 4. Native start (no Docker) ───────────────────────────────────────────────
info "Starting OpenClaw gateway with Hub extension…"
info "Dashboard will be at http://localhost:${HUB_DASHBOARD_PORT:-3001}"
echo ""
exec pnpm openclaw gateway run --bind lan --port 18789
