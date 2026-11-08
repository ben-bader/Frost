import type { Route } from "@frost.js/core";

export const metadata: Route.Metadata = {
  title: "__APP_NAME__ — Frost",
  description: "A Frost application.",
};

export default function HomePage(): React.JSX.Element {
  return (
    <main>
      <h1>Hello, Frost</h1>
      <p>
        Edit <code>src/app/page.tsx</code> — the dev server reloads
        automatically. Try the{" "}
        <a href="/playground" style={{ color: "#0e7490" }}>
          playground
        </a>{" "}
        for a hydrated client component.
      </p>
      <p>
        <code>src/api/</code> holds API routes; add{" "}
        <code>src/app/_middleware.ts</code> for middleware,{" "}
        <code>src/app/error.tsx</code> for an error boundary.
      </p>
    </main>
  );
}
