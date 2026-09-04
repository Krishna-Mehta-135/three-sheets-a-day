"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reads, marginalia } from "@/db/schema";
import { getReader, signIn, signOut } from "@/lib/auth";
import { isPieceType } from "@/lib/types";
import { dayInTz } from "@/lib/dates";

export async function joinAction(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const tz = String(formData.get("tz") ?? "UTC") || "UTC";
  if (!name.trim()) return;
  await signIn(name, tz);
  redirect("/");
}

export async function leaveAction() {
  await signOut();
  redirect("/");
}

export async function markRead(day: string, type: string, pieceId: string) {
  const reader = await getReader();
  if (!reader || !isPieceType(type)) return;

  // Only today's sheets and archived issues you've actually reached can be stamped.
  const today = dayInTz(reader.tz);
  if (day > today) return;

  await db
    .insert(reads)
    .values({ userId: reader.id, day, type, pieceId })
    .onConflictDoNothing();

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath("/archive");
  revalidatePath(`/read/${day}/${type}`);
}

export async function unmarkRead(day: string, type: string) {
  const reader = await getReader();
  if (!reader || !isPieceType(type)) return;
  await db
    .delete(reads)
    .where(
      and(
        eq(reads.userId, reader.id),
        eq(reads.day, day),
        eq(reads.type, type),
      ),
    );
  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/read/${day}/${type}`);
}

export async function saveNote(pieceId: string, noteRaw: string) {
  const reader = await getReader();
  if (!reader) return;
  const note = noteRaw.trim().slice(0, 600);
  if (!note) {
    await db
      .delete(marginalia)
      .where(
        and(
          eq(marginalia.userId, reader.id),
          eq(marginalia.pieceId, pieceId),
        ),
      );
  } else {
    await db
      .insert(marginalia)
      .values({ userId: reader.id, pieceId, note })
      .onConflictDoUpdate({
        target: [marginalia.userId, marginalia.pieceId],
        set: { note },
      });
  }
  revalidatePath("/me");
}
