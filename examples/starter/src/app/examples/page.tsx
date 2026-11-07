import React, { useState } from "react";
import type { Route } from "@frostjs/core";
import { useLoaderData } from "@frostjs/react";
import { HydrationInspector } from "../../components/HydrationInspector.js";
import { ApiClientDemo } from "../../components/ApiClientDemo.js";

export interface BoundaryRecord {
  id: string;
  name: string;
  role: string;
  isPrivileged: boolean;
}

export interface ExamplesLoaderData {
  serverTime: string;
  nodeVersion: string;
  records: BoundaryRecord[];
  recordsSource: string;
}

const fallbackRecords: BoundaryRecord[] = [
  { id: "usr_1", name: "Alice Administrator", role: "admin", isPrivileged: true },
  { id: "usr_2", name: "Bob Developer", role: "engineer", isPrivileged: false },
  { id: "usr_3", name: "Charlie Designer", role: "designer", isPrivileged: false },
];

export async function loader({ url }: Route.LoaderArgs): Promise<ExamplesLoaderData> {
  let records = fallbackRecords;
  let recordsSource = "fallback (loader)";
  try {
    const res = await fetch(new URL("/api/records", url.origin).href);
    if (res.ok) {
      const data = (await res.json()) as { records?: BoundaryRecord[] };
      if (Array.isArray(data.records) && data.records.length > 0) {
        records = data.records;
        recordsSource = "GET /api/records → database.server.ts";
      }
    }
  } catch {
    // Server may be unreachable in isolated test contexts — use fallback.
  }

  return {
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    records,
    recordsSource,
  };
}

export const metadata: Route.Metadata = {
  title: "Examples — Frost Framework",
  description: "Live demonstrations of SSR, hydration, API routes, and server/client boundaries.",
};

const tabs = ["SSR", "Hydration", "Data & API", "Boundaries"] as const;
type ExampleTab = (typeof tabs)[number];

export default function ExamplesPage({ data }: Route.ComponentProps<ExamplesLoaderData>): React.JSX.Element {
  const pageData = data ?? useLoaderData<ExamplesLoaderData>();
  const [activeTab, setActiveTab] = useState<ExampleTab>("SSR");

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ paddingTop: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        <div className="meta" style={{ marginBottom: "var(--space-2)" }}>Examples</div>
        <h1 className="h1">Runtime behaviors, running live.</h1>
        <p className="lede" style={{ marginTop: "var(--space-4)", fontSize: "0.95rem" }}>
          Each tab exercises a real part of the Frost runtime — server loaders,
          client hydration, HTTP endpoints, and module boundaries.
        </p>
      </div>

      <div className="tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`tab${activeTab === tab ? " tab--active" : ""}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="tab-panel">
        {activeTab === "SSR" && <SsrPanel data={pageData} />}
        {activeTab === "Hydration" && <HydrationPanel />}
        {activeTab === "Data & API" && <ApiPanel />}
        {activeTab === "Boundaries" && <BoundariesPanel data={pageData} />}
      </div>
    </div>
  );
}

function SsrPanel({ data }: { data: ExamplesLoaderData }): React.JSX.Element {
  return (
    <div className="grid-split">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div className="surface">
          <div className="surface__head">
            <h3 className="h3">Loader output</h3>
            <span className="pill pill--accent">server</span>
          </div>
          <div className="kv">
            <div className="kv__row"><span className="kv__key">serverTime</span><span className="kv__value kv__value--mono">{data.serverTime}</span></div>
            <div className="kv__row"><span className="kv__key">nodeVersion</span><span className="kv__value kv__value--mono">{data.nodeVersion}</span></div>
            <div className="kv__row"><span className="kv__key">recordsSource</span><span className="kv__value">{data.recordsSource}</span></div>
          </div>
        </div>

        <div className="surface">
          <h3 className="h3" style={{ marginBottom: "var(--space-3)" }}>Render lifecycle</h3>
          <ol style={{ paddingLeft: "1.2em", display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <li>Router matches the URL to <span className="code-inline">/examples</span>.</li>
            <li>The route <span className="code-inline">loader</span> executes on the server with the request context.</li>
            <li>Loader data is serialized into <span className="code-inline">#__FROST_DATA__</span> in the document.</li>
            <li>React renders the page to an HTML string on the server.</li>
            <li>The browser receives styled, complete HTML before any JavaScript runs.</li>
          </ol>
        </div>
      </div>

      <div className="surface surface--code">
        <div className="meta" style={{ marginBottom: "var(--space-3)" }}>src/app/examples/page.tsx</div>
        <pre className="code-block">{`export async function loader({ url }) {
  return {
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    records: await fetchRecords(url),
  };
}

export default function ExamplesPage({ data }) {
  // data was computed on the server
  // and serialized into the HTML
  return <RuntimeDemo {...data} />;
}`}</pre>
      </div>
    </div>
  );
}

function HydrationPanel(): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <HydrationInspector />
      <div className="surface">
        <h3 className="h3" style={{ marginBottom: "var(--space-3)" }}>How hydration works here</h3>
        <ol style={{ paddingLeft: "1.2em", display: "flex", flexDirection: "column", gap: "var(--space-2)", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
          <li>The server embeds route state as JSON in a script tag.</li>
          <li>The client entry module imports the same page and layout modules.</li>
          <li><span className="code-inline">hydrateRoot</span> reuses the server-rendered DOM instead of replacing it.</li>
          <li>Event handlers attach and React state becomes live — the DOM is never rebuilt.</li>
        </ol>
      </div>
      <div className="surface surface--code">
        <div className="meta" style={{ marginBottom: "var(--space-3)" }}>packages/react/src/client.tsx</div>
        <pre className="code-block">{`const state = getClientState(); // parses #__FROST_DATA__
hydrateRoot(rootElement, (
  <FrostProvider value={state}>
    <FrostErrorBoundary>{appTree}</FrostErrorBoundary>
  </FrostProvider>
));`}</pre>
      </div>
    </div>
  );
}

function ApiPanel(): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <ApiClientDemo />
      <div className="surface">
        <h3 className="h3" style={{ marginBottom: "var(--space-3)" }}>Available endpoints</h3>
        <div className="kv">
          <div className="kv__row"><span className="kv__key">GET</span><span className="kv__value kv__value--mono">/api/health</span></div>
          <div className="kv__row"><span className="kv__key">POST</span><span className="kv__value kv__value--mono">/api/echo</span></div>
          <div className="kv__row"><span className="kv__key">GET</span><span className="kv__value kv__value--mono">/api/records</span></div>
        </div>
        <p className="body" style={{ fontSize: "0.8rem", marginTop: "var(--space-4)" }}>
          API routes live in <span className="code-inline">src/api/</span> and dispatch
          through the same request handler as pages. The DELETE request above
          intentionally returns 405 to show error states.
        </p>
      </div>
    </div>
  );
}

function BoundariesPanel({ data }: { data: ExamplesLoaderData }): React.JSX.Element {
  return (
    <div className="grid-split">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
        <div className="surface">
          <div className="surface__head">
            <h3 className="h3">Privileged records</h3>
            <span className="pill pill--accent">{data.recordsSource}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {data.records.map((record) => (
              <div
                key={record.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "var(--space-4)",
                  padding: "var(--space-3) var(--space-4)",
                  background: "var(--surface-secondary)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-medium)",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{record.name}</div>
                  <div className="meta" style={{ marginTop: 2 }}>{record.id}</div>
                </div>
                <span className={`pill ${record.isPrivileged ? "pill--danger" : "pill--success"}`}>{record.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="surface">
          <h3 className="h3" style={{ marginBottom: "var(--space-3)" }}>The boundary</h3>
          <p className="body" style={{ fontSize: "0.85rem" }}>
            <span className="code-inline">database.server.ts</span> strips secret fields
            before data leaves the server. If a client component tried to import it
            directly, the Vite plugin rejects the build with error FS1004.
          </p>
        </div>
      </div>

      <div className="surface surface--code">
        <div className="meta" style={{ marginBottom: "var(--space-3)" }}>FS1004 — boundary violation</div>
        <pre className="code-block code-block--wrap">{`FS1004: Server-only module imported into client bundle.
  Importer: src/components/UserCard.tsx
  Target:   src/server/database.server.ts

Hint: move privileged operations into a server
loader or route action, and pass only public
data to the client component.`}</pre>
      </div>
    </div>
  );
}
