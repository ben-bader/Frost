import React from "react";
import type { Route } from "@frostjs/core";
import { useLoaderData, usePathname } from "@frostjs/react";

export interface OverviewLoaderData {
  serverTime: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
}

export async function loader(): Promise<OverviewLoaderData> {
  return {
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

export const metadata: Route.Metadata = {
  title: "Frost — React full-stack framework",
  description: "Server-rendered React with explicit loaders, hydration, and runtime boundaries.",
};

const architecture = [
  { name: "HTTP request", desc: "node:http", accent: false },
  { name: "Frost Router", desc: "@frostjs/router", accent: false },
  { name: "Loaders & actions", desc: "@frostjs/data", accent: false },
  { name: "Frost Runtime", desc: "@frostjs/server", accent: true },
  { name: "React SSR + hydration", desc: "@frostjs/react", accent: false },
  { name: "Platform adapter", desc: "@frostjs/adapter-node", accent: false },
];

const capabilities = [
  {
    name: "Server-side rendering",
    desc: "Route loaders run on the server and the document is rendered to HTML before it reaches the browser. No client-side bootstrapping is required to see content.",
  },
  {
    name: "Hydration",
    desc: "The serialized route state is embedded in the document and reconnected to the same React tree on the client, preserving DOM and state instead of re-rendering.",
  },
  {
    name: "File-based routing",
    desc: "Pages, layouts, and API endpoints are discovered from the source tree. Route patterns, params, and layout chains are resolved by the router package.",
  },
  {
    name: "Data loading",
    desc: "Loaders execute before render with access to the request, params, URL, and request context. Actions handle mutations on the same route contract.",
  },
  {
    name: "Server/client boundaries",
    desc: ".server modules and Node builtins are rejected from client bundles at build time, keeping privileged code out of the browser.",
  },
  {
    name: "Platform adapters",
    desc: "The runtime speaks Web-standard Request/Response, so hosting is delegated to adapters such as the Node adapter without framework lock-in.",
  },
];

export default function OverviewPage({ data }: Route.ComponentProps<OverviewLoaderData>): React.JSX.Element {
  const pageData = data ?? useLoaderData<OverviewLoaderData>();
  const pathname = usePathname();

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <section style={{ paddingTop: "var(--space-6)" }}>
        <div className="meta" style={{ marginBottom: "var(--space-5)" }}>
          Frost — React full-stack framework
        </div>
        <h1 className="display" style={{ maxWidth: "15ch" }}>
          Server-rendered React, without the magic.
        </h1>
        <p className="lede" style={{ marginTop: "var(--space-5)" }}>
          Frost is a small, explicit runtime for React applications: file-based routes,
          server loaders, deterministic hydration, and hard server/client boundaries —
          all visible in the code you write.
        </p>
        <div className="btn-row" style={{ marginTop: "var(--space-8)" }}>
          <a href="/examples" className="btn btn--primary">Explore examples</a>
          <a href="/playground" className="btn btn--ghost">Open playground</a>
        </div>
      </section>

      {/* Architecture */}
      <section className="section">
        <div>
          <div className="meta" style={{ marginBottom: "var(--space-2)" }}>Architecture</div>
          <h2 className="h2">Request path, end to end</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-8)", alignItems: "start" }}>
          <div className="arch">
            {architecture.map((step, i) => (
              <div key={step.name} className={`arch__node${step.accent ? " arch__node--accent" : ""}`}>
                <span className="arch__index">{String(i + 1).padStart(2, "0")}</span>
                <span className="arch__name">{step.name}</span>
                <span className="arch__desc">{step.desc}</span>
              </div>
            ))}
          </div>
          <div className="surface">
            <div className="meta" style={{ marginBottom: "var(--space-4)" }}>Runtime</div>
            <div className="kv">
              <div className="kv__row"><span className="kv__key">Mode</span><span className="kv__value">{pageData.environment || "development"}</span></div>
              <div className="kv__row"><span className="kv__key">Node</span><span className="kv__value kv__value--mono">{pageData.nodeVersion || "—"}</span></div>
              <div className="kv__row"><span className="kv__key">Route</span><span className="kv__value kv__value--mono">{pathname}</span></div>
              <div className="kv__row"><span className="kv__key">Server time</span><span className="kv__value kv__value--mono">{pageData.serverTime ? pageData.serverTime.slice(11, 19) + " UTC" : "—"}</span></div>
              <div className="kv__row"><span className="kv__key">Uptime</span><span className="kv__value kv__value--mono">{pageData.uptimeSeconds != null ? `${pageData.uptimeSeconds}s` : "—"}</span></div>
            </div>
            <p className="body" style={{ marginTop: "var(--space-5)", fontSize: "0.82rem" }}>
              Every value above is produced by the server loader for this request —
              the same payload the browser hydrates from.
            </p>
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="section">
        <div>
          <div className="meta" style={{ marginBottom: "var(--space-2)" }}>Capabilities</div>
          <h2 className="h2">What the runtime actually does</h2>
        </div>
        <div className="cap-list">
          {capabilities.map((cap) => (
            <div key={cap.name} className="cap-row">
              <div className="cap-row__name">{cap.name}</div>
              <div className="cap-row__desc">{cap.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
