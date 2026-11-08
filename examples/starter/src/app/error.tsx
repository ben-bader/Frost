import type { Route } from "@frost.js/core";

export default function ErrorPage({
  error,
}: Route.ComponentProps): React.JSX.Element {
  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-sm text-red-400">error boundary</p>
      <h1 className="font-display text-4xl font-semibold text-ink-hi">
        Something cracked the ice
      </h1>
      <p className="max-w-md font-mono text-sm text-ink">
        {error?.message ?? "An unexpected error occurred."}
      </p>
    </section>
  );
}
