# Go-live QA script

Run **5 consecutive times** on production (incognito) before submission.

1. Landing loads; sample report section visible (or Google CTA if no demo token).
2. Sign in with Google → `/interview` → pick role + panelist → start voice session.
3. Complete 3+ answers; confirm adaptive follow-up references prior answer in captions.
4. Optional: screen share → verify snapshot count appears in history after session.
5. End round → report loads in under 10s → download PDF → copy share link.
6. Open share URL in second incognito → download PDF works.
7. `/history` → replay → transcript + recording + snapshots visible.
8. Clear sessionStorage → `/report?session={dbSessionId}` still loads saved report.
9. `SMOKE_AUTH_COOKIE=... bun run smoke:frontend` passes against production URL.

## Production deploy checklist

1. Set all env vars from `.env.example` on Vercel.
2. Run `bun run db:deploy && bun run db:seed` against production Neon.
3. Configure Google OAuth redirect URIs for production domain.
4. Set `AUTH_URL` to production origin.
5. Optional: `NEXT_PUBLIC_DEMO_SHARE_TOKEN` for landing sample report.
6. Optional: `SHARE_TOKEN_TTL_DAYS=90` for share link expiry.
