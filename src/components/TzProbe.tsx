"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Records the browser's timezone so anonymous visitors see the right day.
 * If the server guessed differently (it defaults to UTC on a first visit),
 * re-render once the cookie is in place — otherwise someone reading just after
 * local midnight gets served yesterday's issue.
 */
export function TzProbe({ serverTz }: { serverTz: string }) {
  const router = useRouter();

  useEffect(() => {
    let tz: string;
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!tz) return;

    document.cookie = `grist_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
    if (tz !== serverTz) router.refresh();
  }, [serverTz, router]);

  return null;
}
