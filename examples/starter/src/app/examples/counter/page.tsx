import React from "react";
import type { Route } from "@frostjs/core";
import { Counter } from "../../../components/Counter.js";

export async function loader(): Promise<{ initialCount: number }> {
  return {
    initialCount: 42,
  };
}

export const metadata: Route.Metadata = {
  title: "Interactive Counter — Frost Playground",
};

export default function CounterPage({ data }: Route.ComponentProps<{ initialCount: number }>): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
            Example C
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Client-Side Interactivity</span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Interactive Component Demonstration
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "0.95rem" }}>
          This component received initial count <code>{data.initialCount}</code> from the server loader during SSR, and became fully interactive after browser hydration.
        </p>
      </div>

      <Counter initialCount={data.initialCount} />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
          React 19 Compatibility Guarantee
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          Frost preserves standard React components without proprietary runtime abstractions. You can use standard hooks (<code>useState</code>, <code>useEffect</code>, <code>useReducer</code>, <code>useContext</code>) exactly as you would in standard React applications.
        </p>
      </div>
    </div>
  );
}
