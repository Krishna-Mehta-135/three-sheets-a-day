import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { marginalia } from "@/db/schema";
import { getDaily } from "@/lib/daily";
import { getReadTypes } from "@/lib/streak";
import { readerAndDay } from "@/lib/session";
import { PIECE_TYPES, TYPE_META, isPieceType, type PieceType } from "@/lib/types";
import { prettyDay, issueNumber, EPOCH, maxDayAnywhere } from "@/lib/dates";
import { ProgressRail } from "@/components/ProgressRail";
import { StampButton } from "@/components/StampButton";
import { Marginalia } from "@/components/Marginalia";
import { AskTheDesk } from "@/components/AskTheDesk";

export const dynamic = "force-dynamic";

export default async function Read({
  params,
}: {
  params: Promise<{ day: string; type: string }>;
}) {
  const { day, type } = await params;
  if (!isPieceType(type) || !/^\d{4}-\d{2}-\d{2}$/.test(day)) notFound();

  const { reader, today } = await readerAndDay();
  if (day > maxDayAnywhere() || day < EPOCH) redirect("/");

  const [daily, readTypes] = await Promise.all([
    getDaily(day),
    reader ? getReadTypes(reader.id, day) : new Set<PieceType>(),
  ]);

  const piece = daily[type];
  if (!piece) notFound();

  // Keyed by piece, so this can only run once the piece is known — one extra
  // round trip, and only for a signed-in reader.
  const note = reader
    ? (
        await db
          .select()
          .from(marginalia)
          .where(
            and(
              eq(marginalia.userId, reader.id),
              eq(marginalia.pieceId, piece.id),
            ),
          )
          .limit(1)
      )[0]?.note
    : undefined;

  const meta = TYPE_META[type];
  const order = PIECE_TYPES.filter((t) => daily[t]);
  const idx = order.indexOf(type);
  const next = order[(idx + 1) % order.length];
  const isVerse = type === "poem";
  const paragraphs = piece.body.split(/\n\s*\n/).filter((p) => p.trim());

  return (
    <>
      <ProgressRail color={meta.ink} />
      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        {/* ── sheet header ───────────────────────────────────────── */}
        <div className="mono flex flex-wrap items-center justify-between gap-3 pt-8">
          <Link href={day === today ? "/" : "/archive"} className="link-ink">
            ← {day === today ? "today's pile" : "the archive"}
          </Link>
          <span className="opacity-60">
            Issue No. {issueNumber(day)} · {prettyDay(day)}
          </span>
        </div>

        <div
          className="mono mt-6 flex items-center justify-between border-2 border-ink px-4 py-2 font-bold text-paper"
          style={{ background: meta.ink }}
        >
          <span>{meta.label}{piece.topic ? ` · ${piece.topic}` : ""}</span>
          <span className="opacity-80">{meta.blurb}</span>
        </div>

        <header className="mt-8 sm:mt-12">
          <h1 className="display text-[clamp(2.2rem,8vw,5.5rem)] text-balance">
            <span className="misreg" data-text={piece.title}>
              {piece.title}
            </span>
          </h1>
          <p className="mono mt-5 opacity-70">
            {piece.author} · {piece.wordCount.toLocaleString()} words ·{" "}
            {piece.source}
          </p>
        </header>

        <div className="rule-thick my-8 sm:my-10" />

        {/* ── the text ───────────────────────────────────────────── */}
        <article
          className={
            isVerse
              ? "verse mx-auto max-w-2xl"
              : "prose-zine mx-auto max-w-[42rem] text-[1.09rem] leading-[1.72]"
          }
        >
          {isVerse
            ? piece.body
            : paragraphs.map((p, i) => <p key={i}>{p.trim()}</p>)}
        </article>

        <div className="mx-auto mt-14 max-w-[42rem]">
          <div className="rule-thick" />

          {reader ? (
            <>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-6">
                <StampButton
                  day={day}
                  type={type}
                  pieceId={piece.id}
                  read={readTypes.has(type)}
                />
                {next !== type && (
                  <Link
                    href={`/read/${day}/${next}`}
                    className="sheet mono px-5 py-3"
                  >
                    Next sheet: {TYPE_META[next].label} →
                  </Link>
                )}
              </div>
              <AskTheDesk
                pieceId={piece.id}
                title={piece.title}
                author={piece.author}
              />
              <Marginalia pieceId={piece.id} initial={note ?? ""} />
            </>
          ) : (
            <p className="mono mt-8">
              <Link href="/join" className="link-ink">
                Sign the ledger
              </Link>{" "}
              to stamp this one and start a streak.
            </p>
          )}

          {piece.sourceUrl && (
            <p className="mono mt-10 opacity-50">
              Text from{" "}
              <a
                href={piece.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="link-ink"
              >
                {piece.source}
              </a>
              , public domain.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
