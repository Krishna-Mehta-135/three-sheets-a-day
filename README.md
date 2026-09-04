# Three Sheets a Day

One poem, one essay, one short story — pulled from anywhere, no theme, no
genre, no feed. Read all three and the day gets stamped. Miss a day and the
streak resets.

Everything is public-domain text (PoetryDB + Wikisource + Wikiquote). No
AI-generated writing anywhere in the pile. Children's material is filtered out,
and no single author can take more than a handful of slots.

**Ask the desk** — every sheet has an AI panel that has the full text in front
of it. Ask it for context, argue with it, ask what you missed. Runs on Gemini's
free tier; without a key the rest of the app is unaffected.

---

## Run it

### 1. A Postgres database

Any Postgres works. Two easy options:

**Neon (what you'll use on Vercel)** — make a project at
[neon.tech](https://neon.tech), copy the pooled connection string.

**Local, via Docker**

```bash
docker run -d --name grist-pg \
  -e POSTGRES_PASSWORD=grist -e POSTGRES_DB=grist \
  -p 55432:5432 postgres:16-alpine
```

### 2. Environment

```bash
cp .env.example .env
```

```ini
DATABASE_URL="postgresql://postgres:grist@localhost:55432/grist"
AUTH_SECRET="<any long random string>"
GEMINI_API_KEY="<free key from aistudio.google.com/apikey>"
```

Generate a secret: `openssl rand -base64 32`

`GEMINI_API_KEY` is optional — without it every page works, and "Ask the desk"
says it needs a key. Set `GEMINI_MODEL` if `gemini-3.5-flash-lite` isn't on your key
(`curl -H "x-goog-api-key: $KEY" https://generativelanguage.googleapis.com/v1beta/models`
lists what is).

### 3. Tables, texts, go

```bash
npm install
npm run db:push        # create the tables
npm run content:fetch  # ~5 min: downloads ~700 public-domain pieces
npm run content:load   # ink them into the database
npm run dev
```

Open <http://localhost:3000>, type a name, start reading.

---

## Deploy to Vercel

1. Push this folder to a GitHub repo.
2. Import it on Vercel.
3. Storage tab → add **Neon Postgres** (sets `DATABASE_URL` for you), or paste
   your own `DATABASE_URL` into Environment Variables.
4. Add `AUTH_SECRET` and `GEMINI_API_KEY` as Environment Variables.
5. Deploy.

Then, once, from your machine with the production `DATABASE_URL` in `.env`:

```bash
npm run db:push && npm run content:load
```

That's the whole app — no separate backend, no cron. The three sheets for a day
are picked deterministically the first time anyone loads that day, and locked
into the `dailies` table so everyone sees the same issue.

---

## Speed

Two things dominate, and both are about distance:

- **Function region.** `vercel.json` pins execution to `bom1` (Mumbai) so it
  sits beside the Neon database in `ap-south-1`. If you move the database,
  move this too — a function far from its database pays that round trip on
  every query, several times per page.
- **Caching the issue.** A day's three sheets never change once picked, so
  `getDaily` and the epigraph are cached for an hour. Only per-reader state
  (your streak, what you have stamped) touches the database on a warm request.

Independent queries run through `Promise.all` rather than in sequence, and the
connection pool is capped at one on serverless, where each instance handles one
request at a time anyway.

## How it works

| Thing | Where |
|---|---|
| Daily pick (hash of the date, 120-day cooldown so nothing repeats) | `src/lib/daily.ts` |
| Streak maths (a day counts only when all three are stamped) | `src/lib/streak.ts` |
| Name-only sign-in, signed cookie | `src/lib/auth.ts` |
| Riso-print design system (grain, misregistration, halftone, stamps) | `src/app/globals.css` |
| Content pipeline (incremental — safe to re-run) | `scripts/fetch-content.mjs`, `scripts/load-content.mjs` |
| Curation: children's filter, per-author caps | `scripts/curation.mjs` |
| "Ask the desk" — Gemini streaming | `src/app/api/ask/route.ts`, `src/components/AskTheDesk.tsx` |

**Auth is deliberately not secure.** Your name *is* the account — anyone who
types it gets your streak. This is a reading habit, not a bank.

Re-run `npm run content:fetch && npm run content:load` any time to top the
library up; pieces are keyed by a stable hash, so re-loading is idempotent.

## Design

Riso-printed zine: warm newsprint, animated paper grain, misregistered pink/blue
ink plates behind the headlines, halftone dot fields, hard offset shadows, torn
edges, and a rubber stamp that thumps down when you finish a piece. Type is
Bricolage Grotesque / Newsreader / Space Mono.

Respects `prefers-reduced-motion`. Committed to one warm-paper look in both
light and dark system themes — it's paper.
