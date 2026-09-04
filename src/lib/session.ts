import "server-only";
import { cookies, headers } from "next/headers";
import { getReader, type Reader } from "./auth";
import { dayInTz } from "./dates";

/**
 * Timezone, best effort: the signed-in reader's own setting, else the cookie
 * TzProbe drops on first paint, else the edge's geo hint, else UTC.
 */
export async function readerAndDay(): Promise<{
  reader: Reader | null;
  tz: string;
  today: string;
}> {
  const reader = await getReader();
  let tz = reader?.tz;

  if (!tz) {
    const raw = (await cookies()).get("grist_tz")?.value;
    if (raw) tz = decodeURIComponent(raw);
  }
  if (!tz) {
    tz = (await headers()).get("x-vercel-ip-timezone") ?? undefined;
  }

  tz ||= "UTC";
  return { reader, tz, today: dayInTz(tz) };
}
