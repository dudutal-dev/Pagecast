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
npm run voices         # rank account voices + render 20s Hebrew samples to data/previews/samples/
npm run set-voice -- <voiceId>   # choose the narrator (persisted in settings)
npm run ingest         # upsert content/episodes/*.json into the library (by slug)
npm run ingest -- --produce      # …and narrate missing/stale episodes with ElevenLabs
npm run lighthouse     # mobile Lighthouse against a production build
```

Requires Node ≥ 20 and `ffmpeg` on PATH for narration stitching (`winget install ffmpeg` on Windows). Without ffmpeg the narrate route returns a friendly error instead of crashing.

## Stack (fixed — do not swap)

Next.js 15 App Router + TypeScript strict + Tailwind CSS 4. SQLite via `better-sqlite3` + Drizzle ORM (`data/pagecast.db`), MP3s in `data/audio/`. `zustand`, `framer-motion`, `lucide-react`, `zod`, `@anthropic-ai/sdk`. Fonts: Heebo (Hebrew) + Inter (Latin) via `next/font`. Tests: Vitest + Playwright.

## Content model (decided 2026-09-13)

The owner wants no API dependency inside the running app, and the app itself in the form of the
owner's Elixir cocktail atlas: a static PWA. So the repo has two halves:

- **`site/` is the product**: HTML + CSS + JS modules, no build step, hash router, service worker,
  localStorage state. Deployed to GitHub Pages by `.github/workflows/pages.yml` on every push that
  touches `site/`. Everything it needs is inside it: `data/episodes.json`, `audio/*.mp3`,
  `assets/illustrations/*.jpg`. Never add network calls there.
- **The Next.js app + SQLite is the studio**: authoring (`content/episodes/<slug>.json`, written by
  Claude with the book-message-expert skill), narration (`npm run ingest -- --produce`, ElevenLabs
  eleven_v3, voice Jessica `cgSgspJ2msm6clMCkdW9`), illustrations (`npm run illustrations`,
  ElevenLabs Image API, engraving-on-black style prompt in `scripts/illustrations.ts`), and
  `npm run export-site` which packs everything into `site/`.

Adding a book = new JSON in `content/episodes/`, then ingest --produce, illustrations, export-site,
commit, push.

## Architecture

- **Secrets live only on the server.** `.env.local` → Route Handlers under `src/app/api/**`. The client never sees provider keys. `/api/generate` → Anthropic, `/api/episodes/[id]/narrate`, `/api/voices*` → ElevenLabs.
- **Layers:** `src/app` (routes + pages) → `src/server/services/*` (use cases) → `src/server/db` (Drizzle) and `src/server/providers/*` (external I/O). Route handlers only validate (zod), call a service, and map `Result` to HTTP. Providers are interfaces (`TtsProvider`, `LlmProvider`, `StorageProvider`, `CoverSearchProvider`) with a real and a fake implementation; `PAGECAST_MOCK_PROVIDERS=1` selects the fakes (used by e2e tests and demos).
- **Narration pipeline** (`src/server/services/narration/`): script → _narration director_ (Claude rewrites for the ear, adds v3 expression tags sparingly) → user edits/approves → `preprocess` (Hebrew numbers, acronyms, transliteration) → `chunk` (≤ 1,700 chars on paragraph boundaries) → ElevenLabs `with-timestamps` per chunk → ffmpeg concat → MP3 128 kbps + sentence alignment JSON. Progress streams over SSE. Re-generation only when `scriptHash` (performed script + voice + model + settings) changes.
- **The provider truncates silently.** `eleven_v3` stops generating at roughly 200 seconds of audio per request and returns the short take with HTTP 200 and no error: the narration just ends mid-sentence. Hence `MAX_CHUNK_CHARS = 1700` (~145 s at the measured 11.7 Hebrew chars/second) and the `coverage()` check in `produce.ts`, which compares the characters the alignment reports as spoken against the characters sent, discards any take under 98 % and re-requests that chunk in halves. Never raise the chunk size without re-measuring this ceiling. `npm run verify-audio` audits every produced episode and exits non-zero if one is short.
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
