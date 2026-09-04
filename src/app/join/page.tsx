import { redirect } from "next/navigation";
import { joinAction } from "../actions";
import { getReader } from "@/lib/auth";
import { JoinForm } from "@/components/JoinForm";

export const dynamic = "force-dynamic";

export default async function Join() {
  if (await getReader()) redirect("/");
  return (
    <main className="mx-auto max-w-2xl px-5 py-16 sm:px-8 sm:py-24">
      <p className="mono opacity-70">Subscription desk · no email, no password</p>
      <h1 className="display mt-3 text-[clamp(2.8rem,11vw,6rem)]">
        <span className="misreg" data-text="Sign the">
          Sign the
        </span>
        <br />
        <span style={{ color: "var(--ink-blue)" }}>ledger.</span>
      </h1>
      <div className="rule-thick my-7" />
      <p className="mb-8 max-w-lg">
        Write a name. That name is the account — it&apos;s how your streak finds
        you again. Type the same one on any device and you&apos;re back where you
        left off.
      </p>
      <JoinForm action={joinAction} />
      <p className="mono mt-8 max-w-lg leading-relaxed opacity-60">
        Fair warning: anyone who types your name gets your streak. This is a
        reading habit, not a bank.
      </p>
    </main>
  );
}
