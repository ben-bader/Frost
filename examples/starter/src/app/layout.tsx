import React from "react";
import type { Route } from "@frostjs/core";
import { Header } from "../components/Header.js";
import "../styles/theme.css";

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return (
    <div className="site-shell">
      <Header />
      <main className="page-main">
        <div className="page-inner">{children}</div>
      </main>
    </div>
  );
}
