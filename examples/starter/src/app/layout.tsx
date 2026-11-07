import React from "react";
import type { Route } from "@frostjs/core";
import { Header } from "../components/Header.js";
import { Sidebar } from "../components/Sidebar.js";
import "../styles/theme.css";

export default function RootLayout({ children }: Route.ComponentProps): React.JSX.Element {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      <Header />
      <div style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 65px)" }}>
        <Sidebar />
        <main
          style={{
            flex: 1,
            padding: "36px 48px",
            overflowY: "auto",
            maxWidth: "1150px",
            margin: "0 auto",
            width: "100%",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
