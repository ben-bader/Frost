import { Link } from "@frost.js/react";

export default function NotFound(): React.JSX.Element {
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm text-mint">404 — route not found</p>
      <h1 className="font-display text-4xl font-semibold text-ink-hi">
        This page froze over
      </h1>
      <p className="max-w-md text-ink">
        The path you requested doesn&apos;t exist. Frost rendered this inside the
        root layout via the global not-found route.
      </p>
      <Link to="/" className="font-mono text-sm text-mint underline underline-offset-4">
        Back to the demo
      </Link>
    </section>
  );
}
