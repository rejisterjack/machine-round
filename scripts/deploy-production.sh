#!/usr/bin/env bash
# Production deploy runbook — run from repo root after Vercel CLI login (`npx vercel login`).
set -euo pipefail

echo "==> 1. Apply database migrations"
bun run db:deploy

echo "==> 2. Seed RAG question bank (idempotent)"
bun run db:seed

echo "==> 3. Deploy to Vercel production"
npx vercel deploy --prod --yes

echo ""
echo "==> Post-deploy checklist"
echo "  • Set AUTH_URL to your production origin in Vercel env"
echo "  • Add Google OAuth redirect: https://YOUR_DOMAIN/api/auth/callback/google"
echo "  • Optional: NEXT_PUBLIC_DEMO_SHARE_TOKEN for landing sample report"
echo "  • Run: SMOKE_BASE_URL=https://YOUR_DOMAIN bun run smoke:api"
echo "  • Run: SMOKE_BASE_URL=https://YOUR_DOMAIN SMOKE_AUTH_COOKIE='...' bun run smoke:frontend"
echo "  • Complete docs/GO_LIVE_QA.md (5 runs incognito)"
