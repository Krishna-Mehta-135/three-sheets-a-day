#!/usr/bin/env node
/**
 * Pulls public-domain poems, essays and short stories into content/pieces.json.
 *
 *   poems   <- poetrydb.org
 *   essays  <- en.wikisource.org  Category:Essays (+ subcategories)
 *   stories <- en.wikisource.org  Category:Short stories (+ subcategories)
 *
 * Nothing here is subject-specific on purpose: the categories are grab-bags and
 * we shuffle before taking, so the pile stays weird.
 *
 * Wikisource's TextExtracts API returns nothing for these pages (the text is
 * transcluded from Page: namespace), so we render with action=parse and strip
 * the HTML ourselves.
 */
import { writeFile, readFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { curate } from "./curation.mjs";
import { cleanBody, parseAuthor, prettyTitle } from "./extract.mjs";

const UA = "grist/0.1 (personal daily-reading project; non-commercial)";
const WS = "https://en.wikisource.org/w/api.php";

const TARGET = { poem: 240, story: 220, quote: 240 };

/**
 * Wikisource categories, each with its own quota. A single shared essay target
 * meant the generic "Essays" category filled it on its own and the philosophy
 * categories were never reached — so quotas are per bucket, keyed by the topic
 * a source contributes to.
 */
const SOURCES = {
  essay: [
    { category: "Essays", subcats: 12, topic: null, target: 150 },
    { category: "Literary criticism", subcats: 6, topic: null, target: 150 },
    { category: "Philosophy", subcats: 10, topic: "philosophy", target: 90 },
    { category: "Ethics", subcats: 6, topic: "philosophy", target: 90 },
    { category: "Political philosophy", subcats: 6, topic: "philosophy", target: 90 },
    { category: "Philosophy of religion", subcats: 4, topic: "philosophy", target: 90 },
  ],
  story: [
    { category: "Short stories", subcats: 14, topic: null, target: 220 },
  ],
};

/** Wikimedia rate-limits anonymous clients hard; stay serial and polite. */
const GAP_MS = 320;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, tries = 5) {
  for (let i = 0; i < tries; i++) {
    let res;
    try {
      res = await fetch(url, { headers: { "User-Agent": UA } });
    } catch {
      await sleep(800 * (i + 1));
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      const ra = Number(res.headers.get("retry-after")) || 0;
      await sleep(ra ? ra * 1000 : 1200 * (i + 1));
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }
  throw new Error("gave up after retries");
}

function shuffle(arr, seed) {
  let s = seed >>> 0 || 1;
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const id = (...parts) =>
  createHash("sha1").update(parts.join("::")).digest("hex").slice(0, 16);

const words = (s) => s.split(/\s+/).filter(Boolean).length;

/* ── poems ────────────────────────────────────────────────────────────── */

async function fetchPoems(target) {
  const seen = new Map();
  for (let guard = 0; seen.size < target && guard < 40; guard++) {
    const batch = await getJSON("https://poetrydb.org/random/50");
    if (!Array.isArray(batch)) break;
    for (const p of batch) {
      const title = String(p.title ?? "").trim().replace(/\.$/, "");
      const author = String(p.author ?? "Anonymous").trim();
      const lines = Array.isArray(p.lines) ? p.lines : [];
      if (!title || lines.length < 4 || lines.length > 140) continue;
      const body = lines.join("\n").trim();
      if (body.length < 120) continue;
      const key = `${title}|${author}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.set(key, {
        id: id("poetrydb", title, author),
        type: "poem",
        title,
        author,
        body,
        source: "PoetryDB",
        sourceUrl: `https://poetrydb.org/author,title/${encodeURIComponent(author)};${encodeURIComponent(title)}`,
        wordCount: words(body),
      });
    }
    process.stdout.write(`\r  poems ${seen.size}/${target}   `);
  }
  console.log();
  return [...seen.values()].slice(0, target);
}

/* ── wikisource crawl ─────────────────────────────────────────────────── */

async function categoryMembers(category, type) {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    list: "categorymembers",
    cmtitle: `Category:${category}`,
    cmlimit: "500",
    cmtype: type,
    cmnamespace: type === "subcat" ? "14" : "0",
  });
  const out = [];
  let cont = null;
  do {
    if (cont) params.set("cmcontinue", cont);
    const data = await getJSON(`${WS}?${params}`);
    out.push(...(data?.query?.categorymembers ?? []));
    cont = data?.continue?.cmcontinue ?? null;
    await sleep(GAP_MS);
  } while (cont && out.length < 4000);
  return out;
}

/** Direct members plus one level of subcategories — keeps the pool broad. */
async function collectPageIds(rootCategory, maxSubcats) {
  const ids = new Set();
  for (const m of await categoryMembers(rootCategory, "page")) ids.add(m.pageid);
  process.stdout.write(`\r  ${rootCategory}: ${ids.size} pages`);

  const subs = shuffle(
    await categoryMembers(rootCategory, "subcat"),
    rootCategory.length * 7919,
  ).slice(0, maxSubcats);

  for (const sub of subs) {
    const name = sub.title.replace(/^Category:/, "");
    try {
      for (const m of await categoryMembers(name, "page")) ids.add(m.pageid);
    } catch {
      /* skip a bad subcategory */
    }
    process.stdout.write(`\r  ${rootCategory}: ${ids.size} pages (+${name.slice(0, 28)})    `);
  }
  console.log();
  return [...ids];
}

async function fetchPage(pageid, type, topic, tally) {
  const reject = (why) => {
    if (tally) tally[why] = (tally[why] ?? 0) + 1;
    return null;
  };

  const { min, max } = LIMITS[type];
  const data = await getJSON(
    `${WS}?action=parse&format=json&formatversion=2&pageid=${pageid}&prop=text|wikitext`,
  );
  const parse = data?.parse;
  if (!parse?.text) return reject("empty");

  const body = cleanBody(parse.text);
  if (body.length < min) return reject("too-short");
  if (body.length > max) return reject("too-long");
  if (/^\s*(This|The following)\b.{0,40}\b(disambiguation|index|versions)\b/i.test(body))
    return reject("index-page");

  const title = prettyTitle(parse.title ?? "");
  if (!title || title.length > 120) return reject("bad-title");

  return {
    id: id("wikisource", String(pageid)),
    type,
    title,
    author: parseAuthor(parse.wikitext ?? "") ?? "Anonymous",
    body,
    source: "Wikisource",
    sourceUrl: `https://en.wikisource.org/?curid=${pageid}`,
    wordCount: words(body),
    topic: topic ?? null,
  };
}

/* ── quotes (Wikiquote) ──────────────────────────────────────────────── */

const QUOTE_PAGES = [
  "Marcus Aurelius", "Seneca the Younger", "Epictetus", "Michel de Montaigne",
  "Friedrich Nietzsche", "Arthur Schopenhauer", "Baruch Spinoza",
  "Søren Kierkegaard", "Simone Weil", "Hannah Arendt", "Albert Camus",
  "Ludwig Wittgenstein", "William James", "Bertrand Russell", "Iris Murdoch",
  "Ralph Waldo Emerson", "Henry David Thoreau", "Virginia Woolf",
  "James Baldwin", "Zora Neale Hurston", "Anton Chekhov", "Franz Kafka",
  "Fyodor Dostoevsky", "Leo Tolstoy", "Jorge Luis Borges", "Italo Calvino",
  "Ursula K. Le Guin", "Rainer Maria Rilke", "Emily Dickinson",
  "Oscar Wilde", "Samuel Johnson", "William Blake", "John Berger",
  "Susan Sontag", "Joan Didion", "Annie Dillard", "Rebecca Solnit",
  "Confucius", "Laozi", "Zhuangzi", "Rabindranath Tagore",
  "Kahlil Gibran", "Simone de Beauvoir", "Mary Wollstonecraft",
  "Frederick Douglass", "Toni Morrison", "Anne Carson", "Fernando Pessoa",
  "Czesław Miłosz", "Wisława Szymborska", "Seamus Heaney", "Mary Oliver",
  "Richard Feynman", "Alfred North Whitehead", "Blaise Pascal",
  "David Hume", "Immanuel Kant", "Aristotle", "Heraclitus",
];

function cleanQuoteLine(line) {
  let q = line
    .replace(/^\*+\s*/, "")
    .replace(/<ref[\s\S]*?(\/>|<\/ref>)/gi, "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/''+/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return q
    .replace(/\s*\((?:as )?(?:translated|translation|trans\.)[^)]*\)\s*$/i, "")
    .trim();
}

function usableQuote(q) {
  if (q.length < 45 || q.length > 260) return false;
  if (!/[.!?"”’]$/.test(q)) return false;
  if (/\b(Ch\.|p\.|Vol\.|ibid|op\. cit)\b/i.test(q)) return false;
  if (/[Ͱ-ϿЀ-ӿ֐-׿؀-ۿ]/.test(q)) return false;
  if (/[=|]/.test(q)) return false;
  return true;
}

async function fetchQuotes(target) {
  const out = new Map();
  for (const page of shuffle(QUOTE_PAGES, 20260905)) {
    if (out.size >= target) break;
    let data;
    try {
      data = await getJSON(
        `https://en.wikiquote.org/w/api.php?action=parse&format=json&formatversion=2` +
          `&page=${encodeURIComponent(page)}&prop=wikitext`,
      );
    } catch {
      continue;
    }
    const found = (data?.parse?.wikitext ?? "")
      .split("\n")
      .filter((l) => /^\*\s/.test(l))
      .map(cleanQuoteLine)
      .filter(usableQuote);

    // Cap per thinker so nobody dominates the epigraphs.
    for (const q of shuffle(found, page.length * 131).slice(0, 6)) {
      out.set(q, {
        id: id("wikiquote", q),
        text: q,
        author: page,
        sourceUrl: `https://en.wikiquote.org/wiki/${encodeURIComponent(page)}`,
      });
    }
    process.stdout.write(`\r  quotes ${out.size}/${target} (${page.slice(0, 22)})          `);
    await sleep(GAP_MS);
  }
  console.log();
  return [...out.values()].slice(0, target);
}

/* ── incremental wikisource crawl ─────────────────────────────────────── */

/** How many *curated* pieces we hold in a (type, topic) bucket. */
function bucketCount(pieces, type, topic) {
  return curate([...pieces.values()]).kept.filter(
    (p) => p.type === type && (p.topic ?? null) === (topic ?? null),
  ).length;
}

/** How many *curated* pieces of `type` we hold across every bucket. */
function curatedCount(pieces, type) {
  return curate([...pieces.values()]).kept.filter((p) => p.type === type).length;
}

async function topUpWikisource(pieces, type) {
  for (const src of SOURCES[type]) {
    const have = () => bucketCount(pieces, type, src.topic);
    const label = src.topic ?? type;
    if (have() >= src.target) {
      console.log(`  ${label} bucket already full (${have()}/${src.target}) — skipping ${src.category}`);
      continue;
    }
    let ids;
    try {
      ids = shuffle(
        await collectPageIds(src.category, src.subcats),
        (src.category.length + type.length) * 104729,
      );
    } catch {
      console.log(`\n  ! skipped ${src.category}`);
      continue;
    }

    let added = 0;
    const tally = {};
    for (let i = 0; i < ids.length; i++) {
      const pid = ids[i];
      if (pieces.has(id("wikisource", String(pid)))) continue;
      try {
        const p = await fetchPage(pid, type, src.topic, tally);
        if (p) {
          pieces.set(p.id, p);
          added++;
          if (have() >= src.target) break;
        }
      } catch (err) {
        tally.error = (tally.error ?? 0) + 1;
        if (tally.error <= 3) console.log(`\n  ! ${src.category}: ${err.message}`);
      }
      if (i % 10 === 0) {
        process.stdout.write(
          `\r  ${label} · ${src.category.slice(0, 22)}: +${added} ` +
            `(have ${have()}/${src.target}, checked ${i + 1}/${ids.length})     `,
        );
      }
      await sleep(GAP_MS);
    }
    const why = Object.entries(tally)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ${v}`)
      .join(", ");
    console.log(`\n  ${label} · ${src.category}: kept ${added}${why ? ` · rejected: ${why}` : ""}`);
  }
}

async function topUpPoems(pieces, target) {
  for (let guard = 0; guard < 25; guard++) {
    if (curatedCount(pieces, "poem") >= target) break;
    for (const p of await fetchPoems(60)) if (!pieces.has(p.id)) pieces.set(p.id, p);
    process.stdout.write(
      `\r  poem · have ${curatedCount(pieces, "poem")}/${target}          `,
    );
  }
  console.log();
}

/* ── main ────────────────────────────────────────────────────────────── */

const t0 = Date.now();
console.log("Three Sheets a Day · setting type\n");

let existing = [];
try {
  existing = JSON.parse(await readFile("content/pieces.json", "utf8"));
} catch {
  /* first run */
}
const pieces = new Map(existing.map((p) => [p.id, p]));
console.log(`  starting from ${pieces.size} pieces on file\n`);

await topUpPoems(pieces, TARGET.poem);
await topUpWikisource(pieces, "essay");
await topUpWikisource(pieces, "story");
const quotes = await fetchQuotes(TARGET.quote);

const all = [...pieces.values()];
await mkdir("content", { recursive: true });
await writeFile("content/pieces.json", JSON.stringify(all, null, 1));
await writeFile("content/quotes.json", JSON.stringify(quotes, null, 1));

const { kept, dropped } = curate(all);
const tally = (xs) =>
  ["poem", "essay", "story"]
    .map((t) => `${xs.filter((x) => x.type === t).length} ${t}s`)
    .join(", ");
const philosophy = (xs) => xs.filter((x) => x.topic === "philosophy").length;

console.log(
  `\n✓ ${all.length} pieces on file -> ${kept.length} after curation (${tally(kept)})\n` +
    `  of which ${philosophy(kept)} are tagged philosophy\n` +
    `  dropped ${dropped.children} children's, ${dropped.capped} over author cap\n` +
    `  ${quotes.length} quotes\n` +
    `  ${Math.round((Date.now() - t0) / 1000)}s · next: npm run content:load`,
);
