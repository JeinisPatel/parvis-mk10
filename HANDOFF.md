# Mark 9 — Phase A handoff

> What you have, how to run it, what changed, and what comes next.

## What's in this build

PARVIS Mark 9 — Phase A foundations, fully aligned to the Direction-A
redesign mockup and ready to receive the Mark 8 engine.

### Backend (`backend/`)

- **`main.py`** — FastAPI entry. Eager-loads the Bayesian network at
  startup so the first request is fast. **Falls back to a stub engine
  (`parvis_engine/_stub.py`) when the real Mark 8 files aren't present
  yet** so the scaffold can be verified end-to-end on a fresh clone
  before any engine code is copied across.
- **`pyproject.toml`** — declares the package, deps (FastAPI, uvicorn,
  pydantic v2, pgmpy, numpy, scipy, matplotlib), and dev tools (pytest,
  ruff, mypy).
- **`api/v1/health.py`** — `GET /api/v1/health` returns `{ok, engine}`;
  `engine` is `"model"` when the real Mk 8 engine is loaded and
  `"stub"` when the fallback is serving requests.
- **`api/v1/inference.py`** — `POST /api/v1/inference` runs Variable
  Elimination with supplied evidence and returns all posteriors +
  Node 20 via `compute_do_risk()`. Supports `collider_discount` flag
  for the §5.1.19 §8 secondary reading.
- **`api/v1/architecture.py`** — `GET /api/v1/architecture` exposes
  `NODE_META` + `EDGES_VE` as JSON, with proper `from`/`to` aliasing
  (no JSON-key hacks in `model_dump`).
- **`core/settings.py`** — Pydantic settings; env-driven CORS,
  Supabase keys (commented until A.5).
- **`parvis_engine/`** — the seam. The package currently contains
  `_stub.py` (the placeholder engine) and `__init__.py`. **You copy
  your Mark 8 Python files in here** (`model.py`, `doctrine.py`,
  `quantum_diagnostics.py`, `bloch_sphere.py`, `counterfactual_audit.py`,
  `audit_export.py`, `document_analyzer.py`, `stare_decisis.py`,
  `canlii_client.py`) and the API automatically prefers them over
  the stub.

### Frontend (`frontend/`)

- **Next.js 14** App Router + TypeScript + Tailwind CSS, fully typed.
- **`app/layout.tsx`** — root layout. Wraps everything in `<Providers>`
  (React Query) and composes Sidebar + main content area.
- **`app/page.tsx`** — the Overview screen. Calls the inference API
  on load; renders the live posterior badge, top-5 drivers each side
  (sorted from real posteriors), a completeness count, and "What's
  next" cards. Surfaces engine kind in the status pill: green when
  the real engine is running, gold when the stub is.
- **`app/globals.css`** — Tailwind directives + Google Fonts import
  (DM Sans, Fraunces, JetBrains Mono) + `.caption-italic` and
  `.label-caps` utility classes.
- **`components/Sidebar.tsx`** — left nav with the 4 audit phases,
  active-route highlighting via `usePathname()`. **Every nav item now
  has its Glyph icon from the mockup** (profile, chat, record, doc,
  feather, scale, shield, spark, layers, atom, report).
- **`components/TopBar.tsx`** — persistent header with case ID,
  jurisdiction, breadcrumb, and the live posterior badge. Fetches via
  React Query so the value persists across navigation.
- **`components/PosteriorBadge.tsx`** — banded badge with the 5-band
  scale (`Very low / Low / Moderate / Elevated / High`).
- **`components/NodeTag.tsx`** — the `N3`-style chip coloured by node
  family.
- **`components/Providers.tsx`** — React Query client provider.
- **`components/Glyph.tsx`** *(new)* — inline SVG icon component
  plus the `ICON` map (28 stroke-only paths ported from the mockup).
- **`components/LivePosteriorRail.tsx`** *(new)* — the right-rail
  panel for input screens: live posterior badge + recent deltas +
  doctrinal-frame engagement state. Used in Phase B on Profile,
  Chat, Criminal record, Gladue, and SCE.
- **`components/atoms/`** *(new)* — small reusable building blocks
  extracted from the page.tsx and ready to use across Phase B:
  - `SectionHead.tsx` — colour-bar + serif title + caption pattern
  - `DoctrinalStrip.tsx` — coloured-border callout for authorities
  - `Caselaw.tsx` — italic serif inline case name
  - `ItalicCaption.tsx` — sized italic serif caption
  - `MiniBar.tsx` — 4px percentage track
  - `Stat.tsx` — label-caps + serif value (used in headline meta row)
  - `NextCard.tsx` — recommended-action card with phase-coloured stripe
  - `DriverRow.tsx` — node tag + label + signed percent
- **`lib/tokens.ts`** — PV palette as TS constants.
- **`lib/nodes.ts`** — full canonical Chapter 5 `NODE_META` mirror.
- **`lib/api.ts`** — typed fetch wrappers around all three endpoints.

### Root

- **`README.md`** — first-day runbook + project layout + phased plan.
- **`.gitignore`** — Python + Node ignore patterns.

## Tooling

- **Backend**: `uv` + `pyproject.toml`
- **Frontend**: `pnpm` + `package.json` (declares `packageManager: "pnpm@9.12.3"`)

Both are documented in the README; install them globally once and
everything from here uses them.

## How to run it locally (no Mk 8 files needed)

```bash
# Backend — terminal 1
cd backend
uv venv && source .venv/bin/activate
uv pip install -e .
uvicorn main:app --reload --port 8000
```

You'll see a warning that the stub engine is loaded — that's expected
on a fresh clone. The app is fully functional against the stub.

```bash
# Frontend — terminal 2
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. The Overview screen renders with a live
posterior. The headline pill will show **"Stub engine"** in gold until
you copy in the real Mk 8 files; after that it switches to **"In
progress"** in green.

## Going live with the real engine

Copy the nine Mk 8 files into `backend/parvis_engine/`:

```bash
cp ../parvis-mark-8/{model,doctrine,quantum_diagnostics,bloch_sphere,counterfactual_audit,audit_export,document_analyzer,stare_decisis,canlii_client}.py backend/parvis_engine/
```

Restart `uvicorn`. The startup log will now read `[mk9] model engine
ready · 20 nodes loaded` and `/api/v1/health` will report
`{"engine": "model"}`.

### Engine contract

The API depends on these names being importable from
`parvis_engine.model`:

- `NODE_META: dict[str, dict]` — keys are node IDs (strings); each
  value has `name`, `short`, `type`, and `ev` (evidence-bearing flag).
- `EDGES_VE: list[tuple[str, str]]` — directed edges.
- `build_model() -> BayesianNetwork` — returns the pgmpy network.
- `get_inference_engine(model) -> VariableElimination` — returns a
  pgmpy VE object with a `.query(variables, evidence, show_progress)`
  method.
- `compute_do_risk(posteriors: dict[str, float], collider_discount: bool) -> float`
  — the canonical post-VE DO formula.

If your Mark 8 names differ, either rename inside `parvis_engine/` or
add aliases in `parvis_engine/__init__.py` — that's the only place a
shim is allowed; the engine code itself stays untouched.

## What works right now

- ✅ FastAPI boots end-to-end against the stub engine (no Mk 8 files needed)
- ✅ `/api/v1/inference` runs VE; stub returns sensible Moderate-band
  posteriors for empty evidence (~0.42) and Elevated for the mockup
  demo evidence (~0.58)
- ✅ `/api/v1/architecture` returns canonical Chapter 5 nodes + edges
- ✅ Next.js shell renders the workspace (sidebar + top bar + main)
- ✅ Overview page fetches live posteriors and renders drivers from the
  real distribution
- ✅ Engine kind surfaced in health endpoint and the Overview status pill
- ✅ All deep-link routes (`/profile`, `/gladue`, etc.) load — they just
  404 on content until ported in Phase B

## Phase A.5 — auth + persistence (next milestone)

1. **Create a Supabase project** (free tier). Note the URL, anon key,
   and JWT secret.
2. **Backend** — add `PARVIS_SUPABASE_*` to `.env`, install
   `pyjwt[crypto]` + `supabase` (uncomment in `pyproject.toml`), write
   `core/auth.py` (verify JWT on every request via FastAPI dependency).
3. **Frontend** — install `@supabase/supabase-js` + `@supabase/ssr`,
   add `NEXT_PUBLIC_SUPABASE_*` to `.env.local`, create `/login` route,
   gate the main layout behind a session check.
4. **Schema** — one Postgres table:
   ```sql
   create table cases (
     id           uuid primary key default gen_random_uuid(),
     user_id      uuid references auth.users(id) not null,
     name         text not null,
     evidence     jsonb not null default '{}',
     created_at   timestamptz default now(),
     updated_at   timestamptz default now()
   );
   alter table cases enable row level security;
   create policy "own cases" on cases for all using (auth.uid() = user_id);
   ```
5. **Endpoints** — add `cases.py` with `GET /cases`, `POST /cases`,
   `GET /cases/{id}`, `PATCH /cases/{id}/evidence`.

Say the word and I'll do Phase A.5 next.

## Phase B — the remaining screens

Each becomes one `app/<screen>/page.tsx` in Next.js. The Direction-A
mocks in `screens/*.jsx` (from `PARVIS_App-3.zip`) are the visual
reference; the TSX ports use real data from the API. The atoms in
`components/atoms/` and the `LivePosteriorRail` are designed to slot
straight in.

Order: Profile → Chat → Criminal record → Documents → Gladue → SCE →
Risk & distortions → Inference → Scenarios → Quantum → Report.

When you're ready, point me at the screen and I'll port it.
