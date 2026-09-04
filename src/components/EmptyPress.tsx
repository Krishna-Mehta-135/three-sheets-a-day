export function EmptyPress() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-24 sm:px-8">
      <h1 className="display text-[clamp(2.6rem,10vw,5rem)]">
        <span className="misreg" data-text="Press is cold.">
          Press is cold.
        </span>
      </h1>
      <div className="rule-thick my-6" />
      <p className="mb-4">
        Nothing has been printed yet — the library is empty.
      </p>
      <pre className="mono overflow-x-auto border-2 border-ink bg-ink p-4 text-paper">
{`npm run db:push        # create the tables
npm run content:fetch  # pull public-domain texts
npm run content:load   # ink them into the database`}
      </pre>
    </main>
  );
}
