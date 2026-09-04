import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { reads } from "@/db/schema";
import { PIECE_TYPES, type PieceType } from "./types";
import { shiftDay, daysBetween } from "./dates";

export type DayTally = { day: string; n: number };

export type StreakInfo = {
  current: number;
  longest: number;
  totalPieces: number;
  fullDays: number;
  /** day -> how many of the three were read */
  tally: Map<string, number>;
  /** true when today isn't finished but yesterday was — streak still alive */
  atRisk: boolean;
};

export async function getStreak(
  userId: string,
  today: string,
): Promise<StreakInfo> {
  const rows = await db
    .select({ day: reads.day, n: sql<number>`count(*)::int` })
    .from(reads)
    .where(eq(reads.userId, userId))
    .groupBy(reads.day)
    .orderBy(sql`${reads.day} desc`);

  const tally = new Map(rows.map((r) => [r.day, r.n]));
  const need = PIECE_TYPES.length;
  const full = new Set(rows.filter((r) => r.n >= need).map((r) => r.day));

  // Current streak: walk back from today (or yesterday, if today's unfinished).
  let cursor = full.has(today) ? today : shiftDay(today, -1);
  let current = 0;
  while (full.has(cursor)) {
    current++;
    cursor = shiftDay(cursor, -1);
  }

  // Longest run over the whole history.
  const sorted = [...full].sort();
  let longest = 0;
  let run = 0;
  for (let i = 0; i < sorted.length; i++) {
    run = i > 0 && daysBetween(sorted[i - 1], sorted[i]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const totalPieces = rows.reduce((a, r) => a + r.n, 0);
  const atRisk = current > 0 && !full.has(today);

  return { current, longest, totalPieces, fullDays: full.size, tally, atRisk };
}

export async function getReadTypes(
  userId: string,
  day: string,
): Promise<Set<PieceType>> {
  const rows = await db
    .select({ type: reads.type })
    .from(reads)
    .where(and(eq(reads.userId, userId), eq(reads.day, day)));
  return new Set(rows.map((r) => r.type as PieceType));
}
