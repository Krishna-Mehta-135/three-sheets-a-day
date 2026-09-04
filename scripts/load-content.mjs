#!/usr/bin/env node
/** Inks content/pieces.json into the database. Safe to re-run. */
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { curate } from "./curation.mjs";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Put it in .env and re-run.");
  process.exit(1);
}

const raw = JSON.parse(await readFile("content/pieces.json", "utf8"));
if (!Array.isArray(raw) || !raw.length) {
  console.error("content/pieces.json is empty — run `npm run content:fetch`.");
  process.exit(1);
}

// Curation runs here, so re-running the loader re-applies the current rules.
const { kept: pieces, dropped } = curate(raw);
console.log(
  `  curated ${raw.length} -> ${pieces.length} ` +
    `(dropped ${dropped.children} children's, ${dropped.capped} over author cap)`,
);

let quotes = [];
try {
  quotes = JSON.parse(await readFile("content/quotes.json", "utf8"));
} catch {
  /* quotes are optional */
}

const sql = postgres(url, { max: 3, prepare: false });
const CHUNK = 100;
let n = 0;

for (let i = 0; i < pieces.length; i += CHUNK) {
  const batch = pieces.slice(i, i + CHUNK).map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    author: p.author || "Anonymous",
    body: p.body,
    source: p.source,
    source_url: p.sourceUrl ?? null,
    word_count: p.wordCount ?? 0,
    topic: p.topic ?? null,
  }));
  await sql`
    insert into pieces ${sql(batch)}
    on conflict (id) do update set
      title = excluded.title,
      author = excluded.author,
      body = excluded.body,
      word_count = excluded.word_count,
      topic = excluded.topic
  `;
  n += batch.length;
  process.stdout.write(`\r  loaded ${n}/${pieces.length}`);
}

// Anything curated out of the file leaves the library — but never a piece that
// has already been printed as someone's daily issue.
const live = pieces.map((p) => p.id);
const [{ n: purged }] = await sql`
  with gone as (
    delete from pieces
    where id <> all(${live})
      and id not in (select piece_id from dailies)
    returning 1
  ) select count(*)::int as n from gone
`;
if (purged) console.log(`\n  purged ${purged} pieces no longer curated`);

if (quotes.length) {
  for (let i = 0; i < quotes.length; i += CHUNK) {
    const batch = quotes.slice(i, i + CHUNK).map((q) => ({
      id: q.id,
      text: q.text,
      author: q.author,
      source_url: q.sourceUrl ?? null,
    }));
    await sql`
      insert into quotes ${sql(batch)}
      on conflict (id) do update set
        text = excluded.text, author = excluded.author
    `;
  }
  console.log(`\n  ${quotes.length} quotes loaded`);
}

const counts = await sql`select type, count(*)::int as n from pieces group by type order by type`;
console.log("\n✓ library:", counts.map((c) => `${c.n} ${c.type}s`).join(", "));
await sql.end();
