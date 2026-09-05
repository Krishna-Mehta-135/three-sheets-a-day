/**
 * Shared curation rules. Applied at load time so re-running the loader
 * re-curates whatever is already sitting in content/pieces.json.
 */

/** Authors who wrote primarily for children. Whole-author exclusion. */
export const CHILD_AUTHORS = new Set(
  [
    "Alexander Nikolaevich Afanasyev", "E. Nesbit", "Edith Nesbit",
    "Eugene Field", "Fannie Wyche Dunn", "Jane Taylor", "Ann Taylor",
    "Beatrix Potter", "Hans Christian Andersen", "Brothers Grimm",
    "Jacob Grimm", "Wilhelm Grimm", "Louisa May Alcott", "L. Frank Baum",
    "Frank Baum", "Kate Douglas Wiggin", "Thornton Burgess",
    "Thornton W. Burgess", "Howard Pyle", "Joel Chandler Harris",
    "Andrew Lang", "Charles Perrault", "Frances Hodgson Burnett",
    "Lewis Carroll", "Kenneth Grahame", "Johnny Gruelle", "Palmer Cox",
    "Laura E. Richards", "Carolyn Wells", "Elizabeth Prentiss",
    "Mary Mapes Dodge", "Amy Steedman", "Flora Annie Steel",
    "Katharine Pyle", "Clara Doty Bates", "Sara Cone Bryant",
  ].map((a) => a.toLowerCase()),
);

const CHILD_PHRASES = [
  /\bonce upon a time\b/i,
  /\bnursery\b/i,
  /\b(dear |little )?children,? (listen|gather|remember)\b/i,
  /\bfor (boys and girls|little folks|young readers)\b/i,
  /\bfairy(-| )?(tale|land|godmother)\b/i,
  /\bkindergarten\b/i,
  /\bmy little (dears|ones)\b/i,
  /\b(mamma|papa) said\b/i,
];

const CHILD_TITLES =
  /\b(nursery|fairy tale|for children|a child'?s|little folks|bedtime|jingle|mother goose)\b/i;

/** Conservative: an author match, or two independent phrase hits. */
export function isForChildren(piece) {
  if (CHILD_AUTHORS.has((piece.author ?? "").trim().toLowerCase())) return true;
  if (CHILD_TITLES.test(piece.title ?? "")) return true;
  const head = (piece.body ?? "").slice(0, 6000);
  const hits = CHILD_PHRASES.filter((re) => re.test(head)).length;
  return hits >= 2;
}

/**
 * Per-author ceilings, so one prolific name can't eat the pile. Poems get a
 * loose ceiling on purpose: they're short, PoetryDB's corpus is deep per
 * author, and a good poet is worth reading twenty times.
 */
export const AUTHOR_CAP = { poem: 20, essay: 4, story: 4 };

/**
 * Curate a flat list: drop children's material, then round-robin by author so
 * the cap trims the over-represented without gutting the pile.
 */
export function curate(pieces) {
  const dropped = { children: 0, capped: 0 };
  const kept = [];
  const seen = new Map(); // `${type}|${author}` -> count

  const ordered = [...pieces].sort((a, b) => a.id.localeCompare(b.id));
  for (const p of ordered) {
    if (isForChildren(p)) {
      dropped.children++;
      continue;
    }
    const key = `${p.type}|${(p.author ?? "").toLowerCase()}`;
    const n = seen.get(key) ?? 0;
    const cap = AUTHOR_CAP[p.type] ?? 4;
    // "Anonymous" isn't one person — don't cap it like one.
    const anon = /^anonymous$/i.test(p.author ?? "");
    if (!anon && n >= cap) {
      dropped.capped++;
      continue;
    }
    seen.set(key, n + 1);
    kept.push(p);
  }
  return { kept, dropped };
}
