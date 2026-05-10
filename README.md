# VOCA

Monorepo for the VOCA Solana assistant: **TanStack Start + Vite** frontend (with API routes), **Anchor** programs under `contracts/`, and **sync scripts** that keep the IDL aligned with the UI.

## Layout

| Path | Role |
|------|------|
| `frontend/` | App, `/api/*` routes, wallet + agent UI |
| `contracts/` | Anchor program; `target/idl/*.json` is the source of truth for sync |
| `scripts/sync.mjs` | Copies IDL into the frontend consumed by the app |

## Quick start

From the repo root:

```bash
npm install --prefix frontend
cd frontend && npm run env:init
# Edit frontend/.env — see frontend/.env.example
cd .. && npm run dev
```

Or develop only inside `frontend/` (`npm run dev`, `npm run build`) after installing dependencies there.

**Contract sync** (after `anchor build` in `contracts/`, when Anchor is available):

```bash
npm run sync
```

Full rebuild + sync: `npm run sync:all` (runs `anchor build` then sync).

## Environment

Copy `frontend/.env.example` to `frontend/.env` (or run `npm run env:init` in `frontend`). Vite merges `.env` into `process.env` during `vite dev` so server-side API routes and the bridge can read keys without always prefixing `VITE_`. For Cloudflare / production, use the same variables in the host’s secret store or `.dev.vars` as documented in `frontend/.env.example`.

## Chat history

The transcript is **persisted in the browser** (`localStorage`, key `voca-chat-v1`) via Zustand `persist` on `messages` only. After hydration, `ClientGate` rebuilds the **Groq tool context** from those messages so voice and text entry share one session (`frontend/src/lib/agent-chat-session.ts`). Use **Clear** in the conversation panel to wipe UI state, storage, and agent turns.

## Contracts

With [Anchor](https://www.anchor-lang.com/) and Rust installed:

```bash
cd contracts && anchor build && anchor test
```

The root script `npm run build:contracts` runs `anchor build` in `contracts/`.
