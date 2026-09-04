import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-24 sm:px-8">
      <p className="mono opacity-70">404 · misprint</p>
      <h1 className="display mt-3 text-[clamp(3rem,12vw,7rem)]">
        <span className="misreg" data-text="No such">
          No such
        </span>
        <br />
        <span style={{ color: "var(--ink-pink)" }}>sheet.</span>
      </h1>
      <div className="rule-thick my-7" />
      <p className="mb-8">
        That page came off the press blank. Nothing was printed under that
        address.
      </p>
      <Link href="/" className="sheet mono inline-block px-5 py-3" style={{ background: "var(--ink-yellow)" }}>
        ← back to today&apos;s pile
      </Link>
    </main>
  );
}
