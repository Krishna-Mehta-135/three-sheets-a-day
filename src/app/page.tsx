import Link from "next/link";
import { getDaily, getQuote } from "@/lib/daily";
import { getStreak, getReadTypes } from "@/lib/streak";
import { readerAndDay } from "@/lib/session";
import { PIECE_TYPES, type PieceType } from "@/lib/types";
import { prettyDay, issueNumber } from "@/lib/dates";
import { SheetCard } from "@/components/SheetCard";
import { StreakBadge } from "@/components/StreakBadge";
import { Epigraph } from "@/components/Epigraph";
import { EmptyPress } from "@/components/EmptyPress";

export const dynamic = "force-dynamic";

const TILTS = [-1.4, 0.9, -0.6];

export default async function Home() {
  const { reader, today } = await readerAndDay();
  const daily = await getDaily(today);
  const quote = await getQuote(today);
  const readTypes = reader ? await getReadTypes(reader.id, today) : new Set<PieceType>();
  const streak = reader ? await getStreak(reader.id, today) : null;

  const available = PIECE_TYPES.filter((t) => daily[t]);
  if (available.length === 0) return <EmptyPress />;

  return (
    <main className="mx-auto max-w-5xl px-5 pb-10 sm:px-8">
      {/* ── masthead ─────────────────────────────────────────────── */}
      <section className="pt-10 sm:pt-16">
        <p className="mono flex flex-wrap items-center gap-x-3 gap-y-1 opacity-70">
          <span>Issue No. {issueNumber(today)}</span>
          <span aria-hidden>·</span>
          <span>{prettyDay(today)}</span>
          <span aria-hidden>·</span>
          <span>Price: your attention</span>
        </p>

        <h1 className="display mt-3 text-[clamp(3.2rem,13vw,8.5rem)]">
          <span className="misreg block" data-text="Three sheets">
            Three sheets
          </span>
          <span className="block" style={{ color: "var(--ink-pink)" }}>
            a day.
          </span>
        </h1>

        <div className="rule-thick mt-6" />

        <div className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <p className="max-w-md text-[1.05rem] leading-relaxed">
            One poem, one essay, one short story. Pulled from anywhere —
            no theme, no genre, no feed. Read all three and the day gets
            stamped.{" "}
            <span className="bg-yellow px-1">Miss a day and it doesn&apos;t.</span>
          </p>

          {reader && streak ? (
            <StreakBadge
              current={streak.current}
              todayCount={readTypes.size}
              atRisk={streak.atRisk}
            />
          ) : (
            <Link
              href="/join"
              className="sheet mono shrink-0 px-5 py-3 text-center"
              style={{ background: "var(--ink-yellow)" }}
            >
              Sign the ledger →<br />
              <span className="opacity-60">start a streak</span>
            </Link>
          )}
        </div>
      </section>

      {quote && <Epigraph text={quote.text} author={quote.author} />}

      {/* ── ticker ───────────────────────────────────────────────── */}
      <div className="mono mt-10 overflow-hidden border-y-2 border-ink bg-ink py-2 text-paper">
        <span className="marquee">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k}>
              {available.map((t) => (
                <span key={t} className="px-6">
                  {daily[t]!.title.toUpperCase()} — {daily[t]!.author} ✦
                </span>
              ))}
            </span>
          ))}
        </span>
      </div>

      {/* ── today's three ────────────────────────────────────────── */}
      <section className="mt-12 grid gap-8 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
        {available.map((type, i) => {
          const p = daily[type]!;
          return (
            <SheetCard
              key={type}
              day={today}
              type={type}
              n={i + 1}
              title={p.title}
              author={p.author}
              wordCount={p.wordCount}
              topic={p.topic}
              read={readTypes.has(type)}
              tilt={TILTS[i % TILTS.length]}
            />
          );
        })}
      </section>

      {reader && readTypes.size === 3 && (
        <p className="display mt-16 text-center text-[clamp(1.8rem,6vw,3.4rem)]">
          <span className="misreg" data-text="Day complete.">
            Day complete.
          </span>
          <br />
          <span className="mono opacity-60">
            come back tomorrow · new sheets at midnight
          </span>
        </p>
      )}
    </main>
  );
}
