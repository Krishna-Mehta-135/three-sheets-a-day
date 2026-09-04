import Link from "next/link";
import { Mark } from "./Mark";

export function TopBar({ name }: { name: string | null }) {
  return (
    <header className="sticky top-0 z-50 border-b-2 border-ink bg-paper">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-2.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Mark size={32} />
          <span className="display text-xl leading-[0.82] tracking-tight sm:text-[1.35rem]">
            <span className="misreg block" data-text="Three Sheets">
              Three Sheets
            </span>
            <span className="block" style={{ color: "var(--ink-pink)" }}>
              a Day
            </span>
          </span>
        </Link>
        <nav className="mono flex items-center gap-4 sm:gap-6">
          <Link href="/archive" className="hover:bg-yellow">
            Archive
          </Link>
          {name ? (
            <Link
              href="/me"
              className="border-2 border-ink bg-ink px-2.5 py-1 text-paper hover:bg-pink hover:text-ink"
            >
              {name}
            </Link>
          ) : (
            <Link
              href="/join"
              className="border-2 border-ink px-2.5 py-1 hover:bg-yellow"
            >
              Sign the ledger
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
