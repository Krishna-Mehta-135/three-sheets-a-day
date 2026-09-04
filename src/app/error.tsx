"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => console.error(error), [error]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <p className="mono opacity-70">Notice from the press room</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,10vw,5rem)]">
        <span className="misreg" data-text="Ink everywhere.">
          Ink everywhere.
        </span>
      </h1>
      <div className="rule-thick my-7" />
      <p className="mb-7">
        Something went wrong printing this page.
        {error.digest && (
          <>
            {" "}
            The log entry is tagged{" "}
            <code className="mono bg-yellow px-1.5 py-0.5">{error.digest}</code>.
          </>
        )}
      </p>
      <button
        onClick={reset}
        className="sheet mono px-5 py-3"
        style={{ background: "var(--ink-yellow)" }}
      >
        Run it again
      </button>
    </main>
  );
}
