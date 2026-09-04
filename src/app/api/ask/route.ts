import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { getReader } from "@/lib/auth";
import { TYPE_META, isPieceType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite";
const ENDPOINT = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`;

/** Keep the piece well inside the context window without truncating most works. */
const MAX_PIECE_CHARS = 60_000;
const MAX_TURNS = 24;

type Turn = { role: "user" | "model"; text: string };

function systemPrompt(p: typeof pieces.$inferSelect) {
  const kind = isPieceType(p.type) ? TYPE_META[p.type].label.toLowerCase() : p.type;
  return [
    "You are the reading desk at Three Sheets a Day, a daily reading habit.",
    `The reader is working through a ${kind}: "${p.title}" by ${p.author}.`,
    "The full text is below, between the markers. Ground every answer in it.",
    "",
    "How to answer:",
    "- Be direct and concrete. Short paragraphs. No preamble, no restating the question.",
    "- Quote the text when it helps, briefly, and say where in the piece it sits.",
    "- Give the historical or literary context the reader would need but is unlikely to have.",
    "- If something is genuinely ambiguous, say so and give the strongest readings.",
    "- If asked something the text cannot settle, say what the text does and doesn't support.",
    "- Never invent lines, dates, or biography. If you are unsure, say you are unsure.",
    "- Plain prose. No emoji, no bullet-point avalanches, no flattery.",
    "",
    "=== BEGIN TEXT ===",
    p.body.slice(0, MAX_PIECE_CHARS),
    "=== END TEXT ===",
  ].join("\n");
}

export async function POST(req: Request) {
  const reader = await getReader();
  if (!reader) {
    return Response.json({ error: "Sign the ledger first." }, { status: 401 });
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return Response.json(
      {
        error:
          "No GEMINI_API_KEY set. Get a free key at aistudio.google.com/apikey and put it in .env.",
      },
      { status: 501 },
    );
  }

  let payload: { pieceId?: string; turns?: Turn[] };
  try {
    payload = await req.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const pieceId = String(payload.pieceId ?? "");
  const turns = (payload.turns ?? [])
    .filter((t) => t && (t.role === "user" || t.role === "model") && t.text?.trim())
    .slice(-MAX_TURNS)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 4000) }));

  if (!pieceId || turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return Response.json({ error: "Nothing to ask." }, { status: 400 });
  }

  const [piece] = await db
    .select()
    .from(pieces)
    .where(eq(pieces.id, pieceId))
    .limit(1);
  if (!piece) {
    return Response.json({ error: "No such sheet." }, { status: 404 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(ENDPOINT(MODEL), {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt(piece) }] },
        contents: turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        // Headroom matters: on the reasoning models thinking is billed against
        // maxOutputTokens, so a tight budget comes back as an empty reply.
        generationConfig: { temperature: 0.6, maxOutputTokens: 3000 },
      }),
    });
  } catch {
    return Response.json({ error: "Couldn't reach Gemini." }, { status: 502 });
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    const hint =
      upstream.status === 404
        ? ` The model "${MODEL}" isn't available on this key — set GEMINI_MODEL in .env.`
        : upstream.status === 429
          ? " Free-tier rate limit hit; wait a minute."
          : "";
    console.error("gemini error", upstream.status, detail.slice(0, 400));
    return Response.json(
      { error: `Gemini said ${upstream.status}.${hint}` },
      { status: 502 },
    );
  }

  // Re-stream Gemini's SSE as plain text chunks.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const chunks = upstream.body!.getReader();
      let buffer = "";
      try {
        for (;;) {
          const { done, value } = await chunks.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (!data || data === "[DONE]") continue;
            try {
              const json = JSON.parse(data);
              const parts = json?.candidates?.[0]?.content?.parts ?? [];
              for (const part of parts) {
                if (typeof part.text === "string" && part.text) {
                  controller.enqueue(encoder.encode(part.text));
                }
              }
            } catch {
              /* partial frame; the next read will complete it */
            }
          }
        }
      } catch (err) {
        console.error("gemini stream broke", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
    },
  });
}
