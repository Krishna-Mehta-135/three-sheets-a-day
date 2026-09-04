import "server-only";
import { and, desc, eq, inArray, lte, sql, gte } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { dailies, pieces, quotes } from "@/db/schema";
import { PIECE_TYPES, type PieceType } from "./types";
import { hash32 } from "./hash";
import { shiftDay } from "./dates";

export type Piece = typeof pieces.$inferSelect;

/** Don't repeat a piece that ran in the last COOLDOWN days. */
const COOLDOWN = 120;

async function pickFor(day: string, type: PieceType): Promise<string | null> {
  const since = shiftDay(day, -COOLDOWN);
  const recent = await db
    .select({ pieceId: dailies.pieceId })
    .from(dailies)
    .where(and(eq(dailies.type, type), gte(dailies.day, since)));
  const used = new Set(recent.map((r) => r.pieceId));

  const all = await db
    .select({ id: pieces.id })
    .from(pieces)
    .where(eq(pieces.type, type))
    .orderBy(pieces.id);
  if (all.length === 0) return null;

  const pool = all.filter((p) => !used.has(p.id));
  const from = pool.length ? pool : all;
  return from[hash32(`${day}::${type}`) % from.length].id;
}

/** Idempotently lock in the three sheets for a day, then return them. */
async function readDaily(
  day: string,
): Promise<Partial<Record<PieceType, Piece>>> {
  const existing = await db
    .select()
    .from(dailies)
    .where(eq(dailies.day, day));

  const have = new Map(existing.map((r) => [r.type, r.pieceId]));
  const missing = PIECE_TYPES.filter((t) => !have.has(t));

  if (missing.length) {
    const rows: { day: string; type: string; pieceId: string }[] = [];
    for (const type of missing) {
      const pieceId = await pickFor(day, type);
      if (pieceId) rows.push({ day, type, pieceId });
    }
    if (rows.length) {
      await db.insert(dailies).values(rows).onConflictDoNothing();
      // Re-read: a concurrent request may have won the race.
      const fresh = await db
        .select()
        .from(dailies)
        .where(eq(dailies.day, day));
      have.clear();
      for (const r of fresh) have.set(r.type, r.pieceId);
    }
  }

  const ids = [...have.values()];
  if (!ids.length) return {};
  const rows = await db.select().from(pieces).where(inArray(pieces.id, ids));
  const byId = new Map(rows.map((p) => [p.id, p]));

  const out: Partial<Record<PieceType, Piece>> = {};
  for (const [type, id] of have) {
    const p = byId.get(id);
    if (p) out[type as PieceType] = p;
  }
  return out;
}

export async function pieceCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ type: pieces.type, n: sql<number>`count(*)::int` })
    .from(pieces)
    .groupBy(pieces.type);
  return Object.fromEntries(rows.map((r) => [r.type, r.n]));
}

export type Quote = typeof quotes.$inferSelect;

/** Same epigraph for everyone, all day. Not part of the streak. */
async function readQuote(day: string, slot: string): Promise<Quote | null> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(quotes);
  if (!n) return null;
  // Pick by offset rather than pulling the whole table across the wire.
  const [row] = await db
    .select()
    .from(quotes)
    .orderBy(quotes.id)
    .limit(1)
    .offset(hash32(`${day}::${slot}`) % n);
  return row ?? null;
}

/**
 * A day's issue never changes once printed, so it is worth caching across
 * requests — that takes the database out of the path for everything except
 * per-reader state.
 */
export const getDaily = (day: string) =>
  unstable_cache(() => readDaily(day), ["daily", day], {
    revalidate: 3600,
    tags: [`daily:${day}`],
  })();

export type PrintedIssue = {
  day: string;
  type: string;
  title: string;
  author: string;
};

async function readPrinted(upto: string): Promise<PrintedIssue[]> {
  return db
    .select({
      day: dailies.day,
      type: dailies.type,
      title: pieces.title,
      author: pieces.author,
    })
    .from(dailies)
    .innerJoin(pieces, eq(pieces.id, dailies.pieceId))
    .where(lte(dailies.day, upto))
    .orderBy(desc(dailies.day))
    .limit(270);
}

/** Past issues never change, so the archive listing is cacheable wholesale. */
export const getPrinted = (upto: string) =>
  unstable_cache(() => readPrinted(upto), ["printed", upto], {
    revalidate: 3600,
    tags: [`daily:${upto}`],
  })();

export const getQuote = (day: string, slot = "epigraph") =>
  unstable_cache(() => readQuote(day, slot), ["quote", day, slot], {
    revalidate: 3600,
  })();
