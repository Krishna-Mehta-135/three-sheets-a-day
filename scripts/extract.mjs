/**
 * Turning a Wikisource page into readable plain text.
 *
 * Kept apart from the crawler so the rules can be exercised against a single
 * page without running a crawl — which is how the philosophy categories were
 * found to be failing.
 */

/* ── html -> plain text ───────────────────────────────────────────────── */

const ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  mdash: "—", ndash: "–", hellip: "…", rsquo: "’", lsquo: "‘",
  ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", deg: "°",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", uuml: "ü",
  ouml: "ö", auml: "ä", pound: "£", sect: "§", dagger: "†",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? ENTITIES[n.toLowerCase()] ?? m);
}

function htmlToText(html) {
  let h = html;
  h = h.replace(/<(script|style|table)\b[\s\S]*?<\/\1>/gi, " ");
  h = h.replace(/<sup\b[^>]*class="[^"]*reference[^"]*"[\s\S]*?<\/sup>/gi, "");
  h = h.replace(
    /<span\b[^>]*class="[^"]*(pagenum|pagenumber|ws-pagenum)[^"]*"[^>]*>[\s\S]*?<\/span>/gi,
    "",
  );
  h = h.replace(
    /<div\b[^>]*class="[^"]*(ws-noexport|noprint|printfooter|catlinks|licen[cs]e|mbox|navigation)[^"]*"[\s\S]*?<\/div>/gi,
    " ",
  );
  h = h.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, "\n\n$1\n\n");
  h = h.replace(/<br\s*\/?>/gi, "\n");
  h = h.replace(/<\/(p|div|li|dd|dt|blockquote|poem|section)>/gi, "\n\n");
  h = h.replace(/<[^>]+>/g, " ");
  return decodeEntities(h)
    .replace(/[ \t ]+/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const TAIL =
  /\n\s*(Notes?|Footnotes?|References?|External links?|Bibliography|See also|Further reading|About this work|Copyright)\s*\n/i;

const FRONT_JUNK =
  /^(price|published|printed|london|new york|copyright|all rights|entered according|by the|headquarters|no\.|vol\.|chapter|contents|\[|\d+$)/i;

/**
 * Wikisource pages often open with a scanned title page — publisher, price,
 * the title in caps three times. Drop the short lines before the first real
 * paragraph.
 */
function trimFrontMatter(text) {
  const paras = text.split("\n\n");
  const firstReal = paras.findIndex((p) => p.length > 240);
  if (firstReal <= 0 || firstReal > 22) return text;
  const junky = paras
    .slice(0, firstReal)
    .every((p) => p.length < 110 && (p === p.toUpperCase() || FRONT_JUNK.test(p)));
  return junky ? paras.slice(firstReal).join("\n\n") : text;
}

function cleanBody(html) {
  let t = htmlToText(html);
  const cut = t.search(TAIL);
  if (cut > 600) t = t.slice(0, cut);
  return trimFrontMatter(t).trim();
}

function parseAuthor(wikitext) {
  if (!wikitext) return null;
  const strip = (raw) =>
    raw
      .replace(/\[\[(?:Author:)?([^|\]]+)(?:\|([^\]]+))?\]\]/g, (_, x, y) => y || x)
      .replace(/\{\{[^}]*\}\}/g, "")
      .replace(/''+/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();

  const field = wikitext.match(/\|\s*author\s*=\s*([^\n|}]+)/i);
  if (field) {
    const a = strip(field[1]);
    if (a && a.length < 60) return a;
  }
  const link = wikitext.match(/\[\[Author:([^|\]]+)/);
  if (link) {
    const a = link[1].trim();
    if (a && a.length < 60) return a;
  }
  return null;
}

function prettyTitle(full) {
  const leaf = full.split("/").pop().trim();
  return (leaf.length > 2 ? leaf : full).replace(/^["']|["']$/g, "");
}


export {
  decodeEntities,
  htmlToText,
  trimFrontMatter,
  cleanBody,
  parseAuthor,
  prettyTitle,
};
