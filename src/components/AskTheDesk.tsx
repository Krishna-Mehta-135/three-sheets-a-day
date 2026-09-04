"use client";

import { useEffect, useRef, useState } from "react";

type Turn = { role: "user" | "model"; text: string };

const OPENERS = [
  "Explain this plainly",
  "What's the context?",
  "What am I missing?",
  "Why does this still matter?",
];

export function AskTheDesk({
  pieceId,
  title,
  author,
}: {
  pieceId: string;
  title: string;
  author: string;
}) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, open, busy]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || busy) return;

    const next: Turn[] = [...turns, { role: "user", text: q }];
    setTurns([...next, { role: "model", text: "" }]);
    setDraft("");
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pieceId, turns: next }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? `The desk is closed (${res.status}).`);
        setTurns(next);
        return;
      }

      const decoder = new TextDecoder();
      const reader = res.body.getReader();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setTurns([...next, { role: "model", text: acc }]);
      }
      if (!acc.trim()) {
        setError("The desk had nothing to say. Try asking again.");
        setTurns(next);
      }
    } catch {
      setError("Lost the connection mid-sentence.");
      setTurns(next);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="sheet mono mt-14 w-full px-5 py-4 text-left"
        style={{ background: "color-mix(in srgb, var(--ink-blue) 12%, var(--paper))" }}
      >
        <span className="block text-[0.78rem] font-bold">Ask the desk ▸</span>
        <span className="mt-1 block opacity-60">
          about &ldquo;{title}&rdquo; — context, meaning, argue with it
        </span>
      </button>
    );
  }

  return (
    <section className="relative mt-14 border-2 border-ink" style={{ boxShadow: "7px 7px 0 var(--ink)" }}>
      <header
        className="mono flex items-center justify-between border-b-2 border-ink px-4 py-2 font-bold text-paper"
        style={{ background: "var(--ink-blue)" }}
      >
        <span>The desk</span>
        <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">
          close ✕
        </button>
      </header>

      <div className="max-h-[26rem] overflow-y-auto px-4 py-5">
        {turns.length === 0 && (
          <div>
            <p className="mono mb-4 opacity-60">
              Ask anything about {author}&apos;s piece. The whole text is on the desk.
            </p>
            <div className="flex flex-wrap gap-2">
              {OPENERS.map((o) => (
                <button
                  key={o}
                  onClick={() => ask(o)}
                  className="mono border-2 border-ink px-2.5 py-1.5 hover:bg-yellow"
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5">
          {turns.map((t, i) =>
            t.role === "user" ? (
              <p
                key={i}
                className="mono self-end max-w-[85%] border-2 border-ink px-3 py-2"
                style={{ background: "var(--ink-yellow)", letterSpacing: "0.06em" }}
              >
                {t.text}
              </p>
            ) : (
              <div key={i} className="max-w-[92%] whitespace-pre-wrap text-[1.02rem] leading-[1.62]">
                {t.text}
                {busy && i === turns.length - 1 && (
                  <span className="ml-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.15em] bg-ink motion-safe:animate-pulse" />
                )}
              </div>
            ),
          )}
        </div>

        {error && (
          <p
            className="mono mt-5 border-2 border-dashed px-3 py-2"
            style={{ color: "var(--ink-pink)", borderColor: "var(--ink-pink)" }}
          >
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
        className="flex items-end gap-3 border-t-2 border-ink p-3"
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(draft);
            }
          }}
          placeholder={busy ? "thinking…" : "ask something…"}
          className="max-h-32 flex-1 resize-none bg-transparent py-2 text-[1.02rem] outline-none placeholder:opacity-35 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !draft.trim()}
          className="mono border-2 border-ink px-3 py-2 disabled:opacity-30"
          style={{ background: "var(--ink-yellow)" }}
        >
          Ask
        </button>
      </form>
    </section>
  );
}
