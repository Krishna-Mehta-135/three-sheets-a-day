import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Newsreader, Space_Mono } from "next/font/google";
import "./globals.css";
import { TopBar } from "@/components/TopBar";
import { readerAndDay } from "@/lib/session";
import { TzProbe } from "@/components/TzProbe";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Three Sheets a Day",
  description:
    "One poem, one essay, one short story, every single day. Read all three, keep the streak, refill the head.",
};

export const viewport: Viewport = { themeColor: "#efe7d6" };

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If the database is down the page below renders the notice — the shell
  // must not throw first.
  let reader = null;
  let tz = "UTC";
  try {
    ({ reader, tz } = await readerAndDay());
  } catch (err) {
    console.error("layout: could not resolve reader", err);
  }
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${newsreader.variable} ${spaceMono.variable}`}
    >
      <body>
        <div className="grain" aria-hidden />
        <TzProbe serverTz={tz} />
        <TopBar name={reader?.displayName ?? null} />
        {children}
        <footer className="mono mt-24 border-t-2 border-ink px-5 py-6 opacity-70 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
            <span>Three Sheets a Day · printed daily · no subscription, no algorithm</span>
            <span>Texts in the public domain</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
