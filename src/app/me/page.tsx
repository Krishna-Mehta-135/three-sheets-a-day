import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { marginalia, pieces } from "@/db/schema";
import { readerAndDay } from "@/lib/session";
import { getStreak } from "@/lib/streak";
import { shiftDay } from "@/lib/dates";
import { TYPE_META, type PieceType } from "@/lib/types";
import { leaveAction } from "../actions";
import { InkGrid } from "@/components/InkGrid";

export const dynamic = "force-dynamic";

export default async function Me() {
  const { reader, today } = await readerAndDay();
  if (!reader) redirect("/join");

  const s = await getStreak(reader.id, today);
  const notes = await db
    .select({
      note: marginalia.note,
      createdAt: marginalia.createdAt,
      title: pieces.title,
      author: pieces.author,
      type: pieces.type,
    })
    .from(marginalia)
    .innerJoin(pieces, eq(pieces.id, marginalia.pieceId))
    .where(eq(marginalia.userId, reader.id))
    .orderBy(desc(marginalia.createdAt))
    .limit(40);

  const days: string[] = [];
  for (let i = 181; i >= 0; i--) days.push(shiftDay(today, -i));

  const stats = [
    { n: s.current, label: "current streak", unit: "days", ink: "var(--ink-pink)" },
    { n: s.longest, label: "longest run", unit: "days", ink: "var(--ink-blue)" },
    { n: s.fullDays, label: "complete days", unit: "days", ink: "var(--ink-green)" },
    { n: s.totalPieces, label: "sheets read", unit: "total", ink: "var(--ink)" },
  ];

  return (
    <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4 pt-12">
        <h1 className="display text-[clamp(2.4rem,9vw,5.5rem)]">
          <span className="misreg" data-text={reader.displayName}>
            {reader.displayName}
          </span>
        </h1>
        <form action={leaveAction}>
          <button className="mono border-2 border-ink px-3 py-1.5 hover:bg-pink">
            Sign out
          </button>
        </form>
      </div>
      <p className="mono mt-3 opacity-60">
        reading on {reader.tz} time · since {reader.createdAt.toISOString().slice(0, 10)}
      </p>

      <div className="rule-thick my-8" />

      {/* ── numbers ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        {stats.map((st, i) => (
          <div
            key={st.label}
            className="sheet p-4"
            style={{ transform: `rotate(${(i % 2 ? 1 : -1) * 0.8}deg)` }}
          >
            <p className="display text-[clamp(2.4rem,7vw,3.6rem)]" style={{ color: st.ink }}>
              {st.n}
            </p>
            <p className="mono mt-1 opacity-70">{st.label}</p>
          </div>
        ))}
      </section>

      {s.atRisk && (
        <p
          className="stamp mt-8 inline-block text-sm"
          style={{ color: "var(--ink-pink)", transform: "rotate(-3deg)" }}
        >
          streak on the line — today isn&apos;t stamped
        </p>
      )}

      {/* ── the ink grid ─────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="mono mb-4">Half a year of ink</h2>
        <InkGrid days={days} tally={Object.fromEntries(s.tally)} today={today} />
        <p className="mono mt-4 flex flex-wrap items-center gap-3 opacity-60">
          <span>none</span>
          {[0, 1, 2, 3].map((n) => (
            <span
              key={n}
              className="block h-3.5 w-3.5 border-2 border-ink"
              style={{ background: n === 0 ? "transparent" : `color-mix(in srgb, var(--ink) ${n * 33}%, transparent)` }}
            />
          ))}
          <span>all three</span>
        </p>
      </section>

      {/* ── marginalia ───────────────────────────────────────────── */}
      <section className="mt-16">
        <h2 className="display text-[clamp(1.8rem,6vw,3rem)]">Marginalia</h2>
        <div className="rule-thick my-5" />
        {notes.length === 0 ? (
          <p className="mono opacity-60">
            Nothing scribbled yet. Notes you leave under a sheet collect here.
          </p>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2">
            {notes.map((n, i) => (
              <li
                key={i}
                className="sheet p-5"
                style={{
                  transform: `rotate(${(i % 3) - 1}deg)`,
                  background: "color-mix(in srgb, var(--ink-yellow) 20%, var(--paper))",
                }}
              >
                <p className="text-[1.05rem] italic">&ldquo;{n.note}&rdquo;</p>
                <p className="mono mt-4 opacity-60">
                  <span style={{ color: TYPE_META[n.type as PieceType].ink }}>
                    {TYPE_META[n.type as PieceType].label}
                  </span>{" "}
                  — {n.title}, {n.author}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mono mt-16">
        <Link href="/" className="link-ink">
          ← today&apos;s pile
        </Link>
      </p>
    </main>
  );
}
