import type { Route } from "@frostjs/core";
import { Header } from "../components/Header.js";
import "../styles/app.css";

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header />
      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
