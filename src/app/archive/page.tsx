import Link from "next/link";
import { desc, lte, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailies, pieces, reads } from "@/db/schema";
import { readerAndDay } from "@/lib/session";
import { PIECE_TYPES, TYPE_META, type PieceType } from "@/lib/types";
import { prettyDay, issueNumber } from "@/lib/dates";
import { PressNotice } from "@/components/PressNotice";
import { diagnose } from "@/lib/diagnose";

export const dynamic = "force-dynamic";

export default async function Archive() {
  const { reader, today } = await readerAndDay();

  let rows, readRows;
  try {
    rows = await db
      .select({
        day: dailies.day,
        type: dailies.type,
        title: pieces.title,
        author: pieces.author,
      })
      .from(dailies)
      .innerJoin(pieces, eq(pieces.id, dailies.pieceId))
      .where(lte(dailies.day, today))
      .orderBy(desc(dailies.day))
      .limit(270);

    readRows = reader
      ? await db
          .select({ day: reads.day, n: sql<number>`count(*)::int` })
          .from(reads)
          .where(eq(reads.userId, reader.id))
          .groupBy(reads.day)
      : [];
  } catch (err) {
    console.error("archive: database unavailable", err);
    return <PressNotice problem={diagnose(err)} />;
  }
  const readCount = new Map(readRows.map((r) => [r.day, r.n]));

  const byDay = new Map<string, Record<string, { title: string; author: string }>>();
  for (const r of rows) {
    if (!byDay.has(r.day)) byDay.set(r.day, {});
    byDay.get(r.day)![r.type] = { title: r.title, author: r.author };
  }
  const days = [...byDay.keys()].sort().reverse();

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
      <h1 className="display pt-12 text-[clamp(2.6rem,10vw,6rem)]">
        <span className="misreg" data-text="Archive">
          Archive
        </span>
      </h1>
      <p className="mono mt-4 opacity-70">
        {days.length} issue{days.length === 1 ? "" : "s"} printed · everything
        stays readable forever
      </p>
      <div className="rule-thick my-8" />

      {days.length === 0 && (
        <p className="mono opacity-60">Nothing printed yet.</p>
      )}

      <ol className="flex flex-col">
        {days.map((day) => {
          const set = byDay.get(day)!;
          const n = readCount.get(day) ?? 0;
          return (
            <li
              key={day}
              className="grid grid-cols-1 gap-x-6 gap-y-3 border-b-2 border-ink py-6 sm:grid-cols-[10rem_1fr]"
            >
              <div>
                <p className="mono font-bold">
                  No. {issueNumber(day)}
                  {day === today && (
                    <span
                      className="ml-2 px-1.5"
                      style={{ background: "var(--ink-yellow)" }}
                    >
                      today
                    </span>
                  )}
                </p>
                <p className="mono mt-1 opacity-55">{prettyDay(day)}</p>
                {reader && (
                  <p className="mt-2 flex gap-1" aria-label={`${n} of 3 read`}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="block h-2.5 w-2.5 rounded-full border-2 border-ink"
                        style={{ background: i < n ? "var(--ink)" : "transparent" }}
                      />
                    ))}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {PIECE_TYPES.filter((t) => set[t]).map((t) => (
                  <Link
                    key={t}
                    href={`/read/${day}/${t}`}
                    className="group flex flex-wrap items-baseline gap-x-3 gap-y-1"
                  >
                    <span
                      className="mono px-1.5 py-0.5 font-bold text-paper"
                      style={{ background: TYPE_META[t as PieceType].ink }}
                    >
                      {TYPE_META[t as PieceType].label}
                    </span>
                    <span className="text-[1.05rem] group-hover:bg-yellow">
                      {set[t].title}
                    </span>
                    <span className="mono opacity-50">{set[t].author}</span>
                  </Link>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
