# Product Requirements Document

## MachineRound — Train for the Interviewer That Isn't Human

**Hackathon:** OpenAI × NamasteDev Codex Hackathon
**Submission deadline:** 19 July 2026, 23:59 IST
**Author:** Rupam Das
**Status:** Build-ready
**Doc version:** v1.1 (aligned with implementation)

---

## 1. Problem Statement

AI-driven hiring screens are now a standard first filter at a growing number of companies. Candidates are evaluated by a model on clarity, technical depth, structure, and pacing — with no human rapport, no read on how they're doing, and no feedback loop to improve.

Every existing "interview prep" product trains candidates for a **human** interviewer: rapport, storytelling, body language, negotiation. None of them train candidates for what an **AI evaluator** actually scores on — concrete keywords, structured answers, no rambling, adaptive follow-up probing.

This gap is not hypothetical. It is a lived, current problem, encountered directly during a real AI-screened hiring round days before this hackathon.

**MachineRound is an AI agent that runs a realistic AI-style screening interview, adapts its follow-ups based on the candidate's actual answers, and returns a structured readiness report** — so candidates walk into a real AI screen already knowing what it's listening for.

---

## 2. Goals

- Ship a **live, publicly hosted, working prototype** by end of Day 1 (buffer for Day 2 polish).
- Make the AI agent's adaptivity **real, not scripted** — this is the single highest-leverage requirement for the "AI fluency" judging lens.
- Produce a **feedback report** with enough visual polish to be screenshot-worthy.
- Ship a **voice-enabled** interview mode (Azure OpenAI Realtime API) — this is what makes the demo visceral rather than "just a chatbot."
- Deliver a **tightly produced 3-minute demo video** that opens with a true personal story.

## 3. Non-Goals (explicitly out of scope for hackathon build)

- Company-specific or role-database-specific tailoring (keep roles generic: e.g. "Senior Full-Stack Engineer," "Backend Engineer," "Frontend Engineer")
- Multi-language support
- User accounts / auth / persistence across sessions
- Payment or credit-based billing (not needed for a prototype)
- Native mobile app
- Production-grade telephony/voice infra (LiveKit, Exotel, etc.) — Azure OpenAI Realtime only
- Resume parsing or JD matching

---

## 4. Target User

Developers and professionals currently facing, or about to face, an AI-conducted screening round as part of a hiring process — a fast-growing candidate population with no dedicated prep tool today.

**Primary persona (also the demo narrator):** a mid-level engineer who has recently cleared an AI screening round and has a human founder/panel round coming up, wanting to understand and rehearse how AI evaluators actually assess answers.

---

## 5. Core User Flow (MVP)

1. **Landing page** — one-line problem statement, one CTA: "Start a Machine Round."
2. **Role selection** — pick from 3–4 generic role presets (e.g., Full-Stack Engineer, Backend Engineer, Frontend Engineer, Product-minded Engineer).
3. **Interview session** — AI agent asks 5–7 questions (mix of behavioral + technical), voice or text input from the candidate. Agent generates **adaptive follow-ups** based on the specific content of each answer (not a static decision tree).
4. **Session end** — agent signals completion, transitions to report generation.
5. **Readiness report** — structured, visually designed output:
   - Overall readiness score
   - Per-answer breakdown: clarity, structure, technical accuracy signal, "red flags an AI screener would likely flag" (rambling, no concrete example, vague claims)
   - 2–3 concrete, specific improvement actions
6. **Share/replay** — option to restart with a different role.

---

## 6. Functional Requirements

### 6.1 Interview Agent (core — highest priority)
- System prompt defines a strict interviewer persona + explicit scoring rubric (clarity, specificity, structure, technical correctness signal, conciseness).
- Each candidate answer is evaluated **before** generating the next question — the follow-up must reference something specific from the prior answer (proof of real adaptivity, not keyword branching).
- Session state (question count, topics covered, weak signals flagged) held **client-side** in React for the duration of the session — no server persistence required. Vercel serverless functions do not share memory across requests.
- Hard cap of 5–7 questions to keep sessions demo-length and API cost bounded.

### 6.2 Voice Layer
- Azure OpenAI Realtime API (GA `/openai/v1/realtime`, `gpt-realtime-2.1` or latest deployment) for bidirectional speech — agent speaks and listens in real time.
- **WebRTC** (primary) — browser connects audio directly to Azure. A Next.js API route mints ephemeral keys via `/openai/v1/realtime/client_secrets`; no WebSocket server in Next.js/Vercel required.
- WebSocket (server-side only) — fallback for non-browser clients; not used in the Vercel deployment.
- Text input fallback always available (accessibility + reliability during live demo/judging).

### 6.3 Feedback Report
- Generated by a second, explicitly separate agent call (evaluator role, not interviewer role) using the full transcript.
- Rendered as a designed UI screen — not a raw JSON/text dump.
- Must be generated reliably in under ~10 seconds to avoid dead air during judging.

### 6.4 Reliability Requirements (non-negotiable — this is the most repeated instruction in the hackathon brief)
- The hosted URL must work **cold**, with no prior state, for any judge visiting it fresh.
- Every network call must degrade gracefully (timeout → retry once → clear error state, never a blank screen or infinite spinner).
- No feature ships unless it works end-to-end at least 5 times in a row without manual intervention.

---

## 7. Technical Architecture

| Layer | Choice | Notes |
|---|---|---|
| App | Next.js 16 (App Router) + React | Full-stack: UI, API routes, agent orchestration |
| Agent orchestration | LangChain.js | Interviewer chain + separate evaluator chain |
| Model | Azure OpenAI (`gpt-5.1` chat + `text-embedding-3-small`) | Runtime inference uses Azure OpenAI exclusively via `@langchain/openai` |
| Voice | Azure OpenAI Realtime API (`gpt-realtime-2.1` or latest) | Browser WebRTC via ephemeral keys; no browser Speech API |
| RAG (stretch only) | Neon PostgreSQL + pgvector + LangChain `PGVectorStore` | Role-specific question grounding; cut first if behind |
| Database | Neon (`@neondatabase/serverless`) | Pooler connection string; `CREATE EXTENSION vector` required |
| Hosting | Vercel | Single deployment — no separate backend host |
| Build tool | OpenAI Codex | Hackathon build toolkit (not the inference provider) |

**Shared modules:** `lib/ai/azure-openai.ts` (all Azure clients), `lib/db.ts` (Neon SQL client).

**Environment variables (7):** `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_API_VERSION`, `AZURE_OPENAI_CHAT_DEPLOYMENT`, `AZURE_OPENAI_REALTIME_DEPLOYMENT`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, `DATABASE_URL`. See `.env.example`.

**Two-agent design is deliberate:** one agent conducts the interview (in-the-moment, adaptive), a second agent evaluates the full transcript afterward (reflective, structured). Separating these roles produces materially better output quality than a single agent trying to do both, and it's a detail worth surfacing in the demo as evidence of intentional AI design.

---

## 8. Build Plan (2-day window)

**Day 1**
- AM: Interviewer agent system prompt + scoring rubric finalized and tested standalone (text-only, terminal/Postman level)
- Midday: Next.js API routes wired, client-side session state, chat UI connected end-to-end
- PM: Deploy to Vercel — **get a live URL working today, even if ugly**
- EOD: Core loop (role select → questions → adaptive follow-up → end) working live, 5/5 reliable runs

**Day 2**
- AM: Evaluator agent + feedback report UI
- Midday: Voice layer (Azure OpenAI Realtime) — must-have if Day 1 finished on time; cut without hesitation if behind
- PM: Visual polish pass on landing page + report screen
- Evening: Record and edit 3-minute demo video, write README, finalize public repo, optional pitch deck (5–7 slides)
- Buffer: final smoke test of the live URL from a fresh browser/incognito session before submission

---

## 9. Judging Criteria Alignment

| Lens | How MachineRound addresses it |
|---|---|
| Originality | Inverts the standard "practice for a human interviewer" framing; trains for the machine instead |
| Impact | Solves a real, current, fast-growing problem the builder personally experienced days before the hackathon |
| AI fluency | Two-agent design — interviewer must adapt in real time, evaluator must reason over a full transcript. Not a static-script wrapper. |
| Prototype | Deployed live by end of Day 1; reliability requirements treated as non-negotiable |
| Demo | Opens on a true personal story; shows live adaptive follow-up; ends on the readiness report |
| Creativity | Reframing + two-agent architecture + voice layer combine for a demo with genuine texture, not a template clone |

---

## 10. Success Metrics (for the submission itself)

- Live URL loads and completes a full session, cold, in under 3 minutes, every time it's tested.
- At least one adaptive follow-up in the demo video is clearly and visibly tied to something specific the candidate said (this is the proof point for "AI fluency").
- Feedback report looks designed, not dumped.
- Demo video has zero dead air and a clear problem → product → payoff arc.
- Public repo has a README that explains the two-agent architecture in under 200 words.

---

## 11. Stretch Goals (only if core ships with time to spare)

1. RAG-grounded, role-specific question bank via Neon pgvector + LangChain `PGVectorStore`
2. Weak-topic tracking across a session (visual tag cloud in the report)
3. Downloadable/shareable readiness report (PDF export)

**Cut order if behind schedule:** stretch goals → voice layer → report visual polish → pitch deck. The core adaptive interview loop with a text-based report is the floor that must ship no matter what.

---

## 12. Submission Checklist

- [ ] Hosted URL — publicly accessible, tested from an incognito/fresh session
- [ ] Public GitHub repo with a README that ships (setup steps + architecture summary)
- [ ] 3-minute demo video — public link
- [ ] Pitch deck (optional, 5–7 slides) — problem, product, market, what's next
- [ ] Confirm build used OpenAI Codex per hackathon toolkit requirement
- [ ] Final live smoke test within 1 hour of the 23:59 IST deadline