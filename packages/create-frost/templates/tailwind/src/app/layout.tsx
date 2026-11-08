import type { Route } from "@frostjs/core";
import "../styles/app.css";

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return <div className="app">{children}</div>;
}
