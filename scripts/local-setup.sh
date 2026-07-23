#!/usr/bin/env bash
# One-command local setup for the ProGuidance portal.
# Prereqs: Docker Desktop (running), Supabase CLI, Node 20+.
set -euo pipefail

if ! command -v supabase >/dev/null 2>&1; then
  echo "✗ Supabase CLI not found."
  echo "  Install it first: https://supabase.com/docs/guides/cli/getting-started"
  echo "  (macOS: brew install supabase/tap/supabase)"
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "✗ Docker is not running. Start Docker Desktop and try again."
  exit 1
fi

echo "→ Starting the local Supabase stack (first run downloads images)…"
supabase start

echo "→ Writing .env.local from the local stack credentials…"
STATUS="$(supabase status -o env)"
API_URL="$(echo "$STATUS" | sed -n 's/^API_URL="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
ANON_KEY="$(echo "$STATUS" | sed -n 's/^ANON_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"
SERVICE_ROLE_KEY="$(echo "$STATUS" | sed -n 's/^SERVICE_ROLE_KEY="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p')"

if [ -z "$API_URL" ] || [ -z "$ANON_KEY" ]; then
  echo "✗ Could not read credentials from 'supabase status'. Run 'supabase status' manually"
  echo "  and copy API URL / anon key into .env.local (see .env.example)."
  exit 1
fi

{
  echo "NEXT_PUBLIC_SUPABASE_URL=${API_URL}"
  echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}"
  echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000"
  if [ -n "$SERVICE_ROLE_KEY" ]; then
    echo "SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}"
  fi
} > .env.local

echo "→ Applying migrations + demo seed (supabase db reset)…"
supabase db reset

cat <<'DONE'

✓ Local environment ready.

  Start the portal:   npm run dev   →  http://localhost:3000

  Demo logins (password: ProGuidance-Dev-2026!):
    admin@proguidance.dev            administrator (full console)
    manager@proguidance.dev          manager (assigned to Alpha)
    moderator@proguidance.dev        moderator (assigned to Alpha)
    client.alpha@proguidance.dev     client with a demo company
    client.beta@proguidance.dev      client in a second org (isolation demo)
    pending.client@proguidance.dev   stuck on the pending-approval screen

  Captured auth emails:  http://127.0.0.1:54324
  Supabase Studio:       http://127.0.0.1:54323
DONE
