import "server-only";
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const COOKIE = "grist_reader";
const MAX_AGE = 60 * 60 * 24 * 365 * 5;

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set.");
  return s;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function verify(value: string, sig: string): boolean {
  const expected = Buffer.from(sign(value));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export type Reader = typeof users.$inferSelect;

export async function getReader(): Promise<Reader | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx < 1) return null;
  const id = raw.slice(0, idx);
  if (!verify(id, raw.slice(idx + 1))) return null;
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row ?? null;
}

export function normalizeHandle(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
}

/**
 * Name-only sign-in: the handle *is* the account. Deliberately not secure —
 * this is a single-reader project, not a service.
 */
export async function signIn(displayNameRaw: string, tz: string) {
  const displayName = displayNameRaw.trim().slice(0, 40);
  const handle = normalizeHandle(displayName);
  if (!handle) throw new Error("Give me at least one letter or number.");

  let [row] = await db
    .select()
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);

  if (!row) {
    [row] = await db
      .insert(users)
      .values({ id: randomUUID(), handle, displayName, tz })
      .returning();
  } else if (row.tz !== tz) {
    await db.update(users).set({ tz }).where(eq(users.id, row.id));
    row = { ...row, tz };
  }

  const jar = await cookies();
  jar.set(COOKIE, `${row.id}.${sign(row.id)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
  return row;
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
