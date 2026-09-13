# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Pagecast** — a personal "podcast of pages": a library of book summaries where each summary is an episode with text, a narration script, a human-sounding female Hebrew voice (ElevenLabs), a cover/illustration, and playlists. Hebrew RTL, mobile-first, PWA, single-user, runs locally. The full build brief is `pagecast-claude-code-prompt.md`; the design spec is `docs/superpowers/specs/2026-09-13-pagecast-design.md`. Read both before non-trivial work.

## Skills (read before the matching kind of work)

Local copies live in `.claude/skills/`. They are the source of truth for content, design, TTS and QA rules:

- `book-message-expert` — content rules, `Episode` data model, summary/script formats. `references/podcast-app-spec.md` (data model), `references/hebrew-narration.md` (script → narration), `references/accuracy-and-copyright.md` (rules that go into the generation system prompt), `scripts/book_card_svg.py` (the 14 palettes/motifs that `src/lib/svg/bookCard.ts` mirrors).
- `hebrew-tts-expert` — Hebrew preprocessing (numbers → words, acronyms, transliteration), ElevenLabs parameters.
- `ui-ux-pro-max` — design rules and pre-delivery checklist.
- `app-builder` — architecture, testing strategy, security checklist.
- `generic-application-validation` — QA methodology to run before delivery.

## Commands

```bash
npm run dev            # Next.js dev server (http://localhost:3000)
npm run build && npm start
npm run check          # eslint + prettier --check + tsc --noEmit  (must pass before commit; husky runs it)
npm test               # vitest unit tests
npx vitest run tests/unit/narration/chunk.test.ts     # single test file
npx vitest run -t "splits on paragraphs"              # single test by name
npm run test:e2e       # playwright (iPhone 14 viewport, providers mocked via PAGECAST_MOCK_PROVIDERS=1)
npx playwright test tests/e2e/narrate.spec.ts         # single e2e spec
npm run db:generate    # drizzle-kit generate migrations from src/server/db/schema.ts
npm run db:migrate     # apply migrations to data/pagecast.db
npm run backup         # JSON export + zip of data/audio into data/backups/
npm run lighthouse     # mobile Lighthouse against a production build
```

Requires Node ≥ 20 and `ffmpeg` on PATH for narration stitching (`winget install ffmpeg` on Windows). Without ffmpeg the narrate route returns a friendly error instead of crashing.

## Stack (fixed — do not swap)

Next.js 15 App Router + TypeScript strict + Tailwind CSS 4. SQLite via `better-sqlite3` + Drizzle ORM (`data/pagecast.db`), MP3s in `data/audio/`. `zustand`, `framer-motion`, `lucide-react`, `zod`, `@anthropic-ai/sdk`. Fonts: Heebo (Hebrew) + Inter (Latin) via `next/font`. Tests: Vitest + Playwright.

## Architecture

- **Secrets live only on the server.** `.env.local` → Route Handlers under `src/app/api/**`. The client never sees provider keys. `/api/generate` → Anthropic, `/api/episodes/[id]/narrate`, `/api/voices*` → ElevenLabs.
- **Layers:** `src/app` (routes + pages) → `src/server/services/*` (use cases) → `src/server/db` (Drizzle) and `src/server/providers/*` (external I/O). Route handlers only validate (zod), call a service, and map `Result` to HTTP. Providers are interfaces (`TtsProvider`, `LlmProvider`, `StorageProvider`, `CoverSearchProvider`) with a real and a fake implementation; `PAGECAST_MOCK_PROVIDERS=1` selects the fakes (used by e2e tests and demos).
- **Narration pipeline** (`src/server/services/narration/`): script → *narration director* (Claude rewrites for the ear, adds v3 expression tags sparingly) → user edits/approves → `preprocess` (Hebrew numbers, acronyms, transliteration) → `chunk` (≤ 4,000 chars on paragraph boundaries) → ElevenLabs `with-timestamps` per chunk → ffmpeg concat → MP3 128 kbps + sentence alignment JSON. Progress streams over SSE. Re-generation only when `scriptHash` (performed script + voice + model + settings) changes.
- **Player:** one global `<audio>` element mounted in the root layout, driven by a zustand store; MediaSession for lock screen; progress PATCHed every 5 s. Transcript highlighting uses stored alignment, falling back to word-count estimation.
- **Episode generation:** system prompt is compiled at build time from trimmed copies of the skill files in `src/server/ai/prompts/`. Claude must return JSON matching the `Episode` zod schema or `{"unknown": true}`.
- **Illustrations:** `src/lib/svg/bookCard.ts` mirrors `book_card_svg.py` exactly (14 domains → palette + motif). Library grid shows `cardSvg`; episode page prefers `coverUrl`. Never embed real cover images; store URLs only.

## Conventions

- UI copy and communication with the owner: Hebrew. Code, comments, commits: English, Conventional Commits.
- RTL: `dir="rtl"` on `<html>`; use logical Tailwind utilities (`ps-`, `pe-`, `ms-`, `me-`, `start-`, `end-`); English titles wrapped in `<span dir="ltr">`; directional icons get `rtl:-scale-x-100`.
- Design tokens are CSS variables in `src/app/globals.css` (dark: bg `#14110F`, text `#F5F0E8`, accent `#C9A961`; light: bg `#F5F0E8`, text `#1F1B18`). No raw hex in components.
- Accessibility floor: 44 px touch targets, AA contrast, Hebrew `aria-label`s, `prefers-reduced-motion` respected.
- Content rules in generated episodes: own words, at most one quote ≤ 12 words, opinions marked, "מצב הידע היום" line for health/money books, no unmarked spoilers for fiction.
- Before the first push: `git diff --cached | grep -i "sk_"` must be empty.
