import type { Route } from "@frost.js/core";

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return <div className="app">{children}</div>;
}
