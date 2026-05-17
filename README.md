# PARVIS Mark 9

**Probabilistic and Analytical Reasoning Virtual Intelligence System — research prototype, v9.**

Mark 9 is the post-Streamlit rebuild. The Bayesian engine, CPTs, and
doctrinal logic from Mark 8 are preserved verbatim and re-exposed as a
JSON API. The UI is a Next.js application that lifts the Direction-A
redesign directly.

> Research prototype. Not for deployment in live proceedings.

---

## Stack

| Layer          | Choice                                                  |
| -------------- | ------------------------------------------------------- |
| Frontend       | Next.js 14 (App Router) + TypeScript + Tailwind CSS     |
| Backend        | FastAPI + Python 3.11 + pgmpy + uvicorn                 |
| Auth + DB      | Supabase (Postgres + Auth + Storage) — _added Phase A.5_ |
| Frontend host  | Vercel                                                  |
| Backend host   | Fly.io (or Render — Phase B decision)                   |
| Repo           | Monorepo — `backend/` + `frontend/`                     |

---

## First-day runbook

You need: **Python 3.11+**, **Node 20+**, **pnpm** (`npm i -g pnpm`),
**uv** (`curl -LsSf https://astral.sh/uv/install.sh | sh`).

The app boots immediately on a fresh clone — there's a stub engine
that ships in `backend/parvis_engine/_stub.py`. You can verify the
full stack end-to-end before copying any Mark 8 code in. The Overview
status pill turns gold to indicate that the stub is running; it goes
green once the real engine is loaded.

```bash
# Push to GitHub once locally (one-time)
git init && git add . && git commit -m "mk9 scaffold"
gh repo create parvis-mark-9 --private --source=. --remote=origin --push
```

### Backend — runs on http://localhost:8000

```bash
cd backend
uv venv && source .venv/bin/activate          # Create & activate venv
uv pip install -e .                            # Install backend + Mark 8 engine
uvicorn main:app --reload --port 8000          # Run with hot reload
```

Verify: `curl http://localhost:8000/api/v1/health` →
`{"ok": true, "engine": "stub"}` on a fresh clone,
`{"ok": true, "engine": "model"}` once the Mark 8 files are in place.

### Frontend — runs on http://localhost:3000

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000> — you should see the Overview screen with
a live posterior fetched from the backend.

---

## Copying Mark 8's engine across

After you clone Mark 8's repo, copy these into `backend/parvis_engine/`:

- `model.py`
- `doctrine.py`
- `quantum_diagnostics.py`
- `bloch_sphere.py`
- `counterfactual_audit.py`
- `audit_export.py`
- `document_analyzer.py`
- `stare_decisis.py`
- `canlii_client.py`

That's it — `pyproject.toml` already declares `parvis_engine` as a
package. The FastAPI app prefers the real `model.py` over `_stub.py`
automatically; restart `uvicorn` and you'll see `[mk9] model engine
ready` in the boot log.

If your Mark 8 file names differ from this list, see HANDOFF.md for
the import contract — only five symbols need to be reachable from
`parvis_engine.model` for the API to light up.

---

## Project layout

```
parvis-mark-9/
├── README.md                          ← you are here
├── HANDOFF.md                         ← what was built, what's next
├── .gitignore
├── backend/
│   ├── pyproject.toml                 ← Python deps + package config
│   ├── main.py                        ← FastAPI app entry; prefers real
│   │                                    engine, falls back to stub
│   ├── api/v1/                        ← Versioned API surface
│   │   ├── inference.py               ← POST /inference — run VE
│   │   ├── architecture.py            ← GET /architecture — nodes + edges
│   │   ├── cases.py                   ← (Phase A.5) Save / load cases
│   │   └── health.py                  ← Liveness probe + engine kind
│   ├── core/
│   │   ├── settings.py                ← Env config
│   │   └── auth.py                    ← (Phase A.5) Supabase JWT verify
│   └── parvis_engine/
│       ├── __init__.py                ← Package doc
│       ├── _stub.py                   ← Fallback engine (canonical NODE_META)
│       └── model.py et al.            ← Mark 8's Python (copy in)
└── frontend/
    ├── package.json                   ← pnpm-managed
    ├── next.config.mjs                ← /api proxy → :8000 in dev
    ├── tsconfig.json
    ├── tailwind.config.ts             ← PV palette as semantic tokens
    ├── postcss.config.mjs
    ├── .env.example
    ├── app/
    │   ├── layout.tsx                 ← Shell — sidebar + main
    │   ├── page.tsx                   ← Overview screen (/)
    │   ├── profile/page.tsx           ← (Phase B) Profile
    │   ├── …                          ← More screens land here
    │   └── globals.css                ← Tailwind directives + tokens
    ├── components/
    │   ├── Sidebar.tsx                ← Left nav · 4 phases · Glyph icons
    │   ├── TopBar.tsx                 ← Case header + posterior badge
    │   ├── PosteriorBadge.tsx         ← 5-band sm/lg readout
    │   ├── NodeTag.tsx                ← N{id} chip coloured by family
    │   ├── Glyph.tsx                  ← Inline SVG icon + ICON map
    │   ├── LivePosteriorRail.tsx      ← Right rail for input screens
    │   ├── Providers.tsx              ← React Query client
    │   └── atoms/                     ← Shared UI atoms (Phase B-ready)
    │       ├── SectionHead.tsx
    │       ├── DoctrinalStrip.tsx
    │       ├── Caselaw.tsx
    │       ├── ItalicCaption.tsx
    │       ├── MiniBar.tsx
    │       ├── Stat.tsx
    │       ├── NextCard.tsx
    │       └── DriverRow.tsx
    └── lib/
        ├── api.ts                     ← Typed fetch client
        ├── nodes.ts                   ← Canonical NODE_META mirror
        └── tokens.ts                  ← PV palette + fonts
```

---

## Phased plan

| Phase | Duration | What ships                                                         |
| ----- | -------- | ------------------------------------------------------------------ |
| A     | 1–2 wk   | Scaffold, FastAPI shell, Next.js shell, **Overview screen working** |
| A.5   | 1 wk     | Supabase auth (Google + email), case persistence to Postgres        |
| B     | 3–4 wk   | Intake phase end-to-end (Profile, Chat, Record, Documents)          |
| C     | 4–6 wk   | Doctrine + Analysis (Gladue, SCE, Risk & distortions, Inference, Scenarios, Quantum) |
| D     | 2–3 wk   | Audit report + polish + deployment                                  |

---

## Engineering principles

- **The Bayesian engine is sacred.** `parvis_engine/` is copied verbatim
  from Mark 8 and never modified to suit the UI. If the UI needs a new
  shape of data, the API layer transforms it — never the engine.
- **The API is versioned.** Every route lives under `/api/v1/`. Breaking
  changes get a new version.
- **The frontend is stateless about cases.** All case state lives in
  Postgres (after A.5); the frontend reads + writes via the API.
- **Posteriors come from the server.** Never re-compute on the client.
  Always round-trip.
- **The scaffold boots without the engine.** A stub serves until Mark 8
  is wired in, so the chrome can be developed and reviewed in isolation.
- **One screen at a time, end-to-end.** A working Overview is worth more
  than half-built versions of everything.
