# Hackathon submission checklist (PRD §12)

## In repository

- [x] Public GitHub repo with README (architecture + setup)
- [x] `.env.example` with full integration list
- [x] CI workflow (lint, test, build, smoke)
- [x] Go-live QA script — see [GO_LIVE_QA.md](./GO_LIVE_QA.md)
- [x] OpenAI Codex credit in README
- [x] Pitch deck — https://nmr.rejisterjack.com/pitch-deck.html (source: [`docs/pitch-deck.html`](./pitch-deck.html), deployed copy: `public/pitch-deck.html`)
- [x] Demo video script — [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md)
- [x] Production deploy script — `bash scripts/deploy-production.sh`

## External deliverables

- [x] **Hosted public URL** — https://nmr.rejisterjack.com (health + smoke API passing)
- [ ] **3-minute demo video** — record per [DEMO_VIDEO_SCRIPT.md](./DEMO_VIDEO_SCRIPT.md), upload, add link below
- [ ] **Pitch deck PDF** (optional) — Print `docs/pitch-deck.html` → Save as PDF, or upload to Drive
- [ ] **Final live smoke** — [GO_LIVE_QA.md](./GO_LIVE_QA.md) × 5 incognito (manual voice path)

## Submission links

| Artifact | URL |
|---|---|
| **Live app** | https://nmr.rejisterjack.com |
| **GitHub** | https://github.com/rejisterjack/machine-round |
| Demo video | _paste public link after recording_ |
| Pitch deck | https://nmr.rejisterjack.com/pitch-deck.html |

## Verified on production (2026-07-19)

```
GET /api/health → ok, db, azure, cloudinary, auth all true
SMOKE_BASE_URL=https://nmr.rejisterjack.com bun run smoke:api → passed
```

## Redeploy

```bash
npx vercel deploy --prod --yes
# or
bash scripts/deploy-production.sh
```
