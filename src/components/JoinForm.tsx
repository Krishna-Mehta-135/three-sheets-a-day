"use client";

import { useState, useEffect } from "react";
import { useFormStatus } from "react-dom";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="sheet mono px-6 py-4 text-left disabled:opacity-50"
      style={{ background: "var(--ink-yellow)" }}
    >
      {pending ? "Inking…" : "Start the streak →"}
    </button>
  );
}

export function JoinForm({
  action,
}: {
  action: (fd: FormData) => Promise<void>;
}) {
  const [tz, setTz] = useState("UTC");
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {
      /* keep UTC */
    }
  }, []);

  return (
    <form action={action} className="flex flex-col gap-6 sm:flex-row sm:items-end">
      <input type="hidden" name="tz" value={tz} />
      <label className="flex-1">
        <span className="mono opacity-70">Reader</span>
        <input
          name="name"
          required
          maxLength={40}
          autoComplete="off"
          autoFocus
          placeholder="e.g. krishna"
          className="display mt-2 w-full border-b-[3px] border-ink bg-transparent pb-2 text-[clamp(1.8rem,7vw,3rem)] outline-none placeholder:opacity-25 focus:border-pink"
        />
      </label>
      <Submit />
    </form>
  );
}
