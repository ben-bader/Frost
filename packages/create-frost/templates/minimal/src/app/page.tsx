import type { Route } from "@frostjs/core";

export const metadata: Route.Metadata = {
  title: "My Frost App",
};

export default function HomePage(): React.JSX.Element {
  return (
    <main>
      <h1>Hello, Frost</h1>
      <p>Edit src/app/page.tsx — the dev server reloads automatically.</p>
    </main>
  );
}
