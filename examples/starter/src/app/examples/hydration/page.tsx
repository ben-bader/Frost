import React from "react";
import type { Route } from "@frostjs/core";
import { HydrationInspector } from "../../../components/HydrationInspector.js";

export async function loader({ request, url }: Route.LoaderArgs) {
  return {
    source: "Server Loader",
    generatedAt: new Date().toISOString(),
    pathname: url.pathname,
  };
}

export const metadata: Route.Metadata = {
  title: "Client Hydration — Frost Playground",
};

export default function HydrationPage({ data }: Route.ComponentProps): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
            Example B
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Client Hydration Lifecycle</span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Client Hydration Demonstration
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "0.95rem" }}>
          Observe how Frost bridges the gap between static server HTML and dynamic client-side interactivity using React 19&apos;s <code>hydrateRoot</code>.
        </p>
      </div>

      <HydrationInspector />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
          How Frost Hydration Works
        </h3>
        <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
          <li>Server runs <code>loader()</code> and renders the initial HTML with <code>renderToString</code>.</li>
          <li>Server embeds the loader data and route parameters into a secure JSON tag <code>&lt;script id=&quot;__FROST_DATA__&quot;&gt;</code>.</li>
          <li>Vite bundles the client entrypoint script and loads it via <code>&lt;script type=&quot;module&quot;&gt;</code>.</li>
          <li>Client reads <code>__FROST_DATA__</code> and calls <code>hydrateRoot(document.getElementById(&quot;__frost&quot;), ...)</code>.</li>
          <li>React attaches event listeners to existing DOM nodes without re-rendering or content flashing.</li>
        </ol>
      </div>
    </div>
  );
}
