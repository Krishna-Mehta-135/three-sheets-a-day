import Link from "next/link";
import { TYPE_META, type PieceType } from "@/lib/types";

const READ_WPM = 200;

export function SheetCard({
  day,
  type,
  title,
  author,
  wordCount,
  topic,
  read,
  tilt,
  n,
}: {
  day: string;
  type: PieceType;
  title: string;
  author: string;
  wordCount: number;
  topic?: string | null;
  read: boolean;
  tilt: number;
  n: number;
}) {
  const meta = TYPE_META[type];
  const minutes = Math.max(1, Math.round(wordCount / READ_WPM));

  return (
    <Link
      href={`/read/${day}/${type}`}
      className="sheet group flex min-h-[15rem] flex-col justify-between p-5 sm:min-h-[19rem]"
      style={
        {
          transform: `rotate(${tilt}deg)`,
          "--tilt-hover": `${tilt / 2}deg`,
        } as React.CSSProperties
      }
    >
      {/* colour band */}
      <div
        className="-mx-5 -mt-5 mb-5 flex items-center justify-between border-b-2 border-ink px-5 py-2"
        style={{ background: meta.ink }}
      >
        <span className="mono font-bold text-paper">
          No.{String(n).padStart(2, "0")} / {meta.label}
        </span>
        <span className="text-paper" aria-hidden>
          {meta.glyph}
        </span>
      </div>

      <div>
        <h2 className="display text-[clamp(1.6rem,4.2vw,2.5rem)] text-balance">
          {title}
        </h2>
        <p className="mono mt-3 opacity-70">{author}</p>
        {topic && (
          <p className="mono mt-3 inline-block border-2 border-ink px-1.5 py-0.5">
            {topic}
          </p>
        )}
      </div>

      <div className="mt-6 flex items-end justify-between gap-3">
        <span className="mono opacity-60">
          {minutes} min · {wordCount.toLocaleString()} words
        </span>
        {read ? (
          <span
            className="stamp text-[0.6rem]"
            style={{ color: "var(--ink-green)", transform: "rotate(-8deg)" }}
          >
            Read
          </span>
        ) : (
          <span
            className="mono border-2 border-ink px-2 py-1 transition-colors group-hover:bg-ink group-hover:text-paper"
            style={{ letterSpacing: "0.14em" }}
          >
            Open →
          </span>
        )}
      </div>

      <span
        className="halftone pointer-events-none absolute -bottom-px -right-px h-16 w-16 opacity-25"
        style={{ color: meta.ink }}
        aria-hidden
      />
    </Link>
  );
}
