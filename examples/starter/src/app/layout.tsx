import React from "react";
import type { Route } from "@frostjs/core";
import { Header } from "../components/Header.js";
import { Footer } from "../components/Footer.js";
import "../styles/theme.css";

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return (
    <div className="site">
      <Header />
      <main className="site-main">{children}</main>
      <Footer />
    </div>
  );
}
