import React, { useState } from "react";
import type { Route } from "@frostjs/core";
import { useLoaderData } from "@frostjs/react";
import { HydrationInspector } from "../../components/HydrationInspector.js";
import { ApiClientDemo } from "../../components/ApiClientDemo.js";
import { CopyButton } from "../../components/CopyButton.js";


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
  title: "Examples — Frost",
  description: "Live demonstrations of SSR, hydration, API routes, and server/client boundaries.",
  
};

const tabs = ["SSR", "Hydration", "Data & API", "Boundaries"] as const;
type ExampleTab = (typeof tabs)[number];

export default function ExamplesPage({ data }: Route.ComponentProps<ExamplesLoaderData>): React.JSX.Element {
  const pageData = data ?? useLoaderData<ExamplesLoaderData>();
  const [activeTab, setActiveTab] = useState<ExampleTab>("SSR");

  return (
    <section className="band band--lift">
      <div className="wrap band__inner">
      <div className="page-head">
        <h1 className="page-title">Runtime behaviors, running live.</h1>
        <p className="page-lede">
          Each tab exercises a real part of the Frost runtime — server loaders,
          client hydration, HTTP endpoints, and module boundaries.
        </p>
      </div>

      <div className="tabs" role="tablist" aria-label="Examples">
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
    </section>
  );
}

const SSR_SOURCE = `export async function loader({ url }) {
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
}`;

const HYDRATION_SOURCE = `const state = getClientState(); // parses #__FROST_DATA__
hydrateRoot(rootElement, (
  <FrostProvider value={state}>
    <FrostErrorBoundary>{appTree}</FrostErrorBoundary>
  </FrostProvider>
));`;

const BOUNDARY_SOURCE = `FS1004: Server-only module imported into client bundle.
  Importer: src/components/UserCard.tsx
  Target:   src/server/database.server.ts

Hint: move privileged operations into a server
loader or route action, and pass only public
data to the client component.`;

function CodePanel({ filename, code }: { filename: string; code: string }): React.JSX.Element {
  return (
    <div className="code-panel">
      <div className="code-panel__bar">
        <span>{filename}</span>
        <CopyButton text={code} label="Copy code" />
      </div>
      <div className="code-panel__body">
        <pre className="code-block--wrap"><code>{code}</code></pre>
      </div>
    </div>
  );
}

function SsrPanel({ data }: { data: ExamplesLoaderData }): React.JSX.Element {
  return (
    <div className="demo-grid">
      <div className="demo-span-7">
        <div className="panel">
          <div className="panel__head">
            <div>
              <div className="panel__title">Loader output</div>
              <div className="panel__note">produced on the server for this request</div>
            </div>
            <span className="tag">server</span>
          </div>
          <div className="kv">
            <div className="kv__row"><span className="kv__key">serverTime</span><span className="kv__value">{data.serverTime}</span></div>
            <div className="kv__row"><span className="kv__key">nodeVersion</span><span className="kv__value">{data.nodeVersion}</span></div>
            <div className="kv__row"><span className="kv__key">recordsSource</span><span className="kv__value">{data.recordsSource}</span></div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__title" style={{ marginBottom: "var(--space-4)" }}>Render lifecycle</div>
          <ol className="explain">
            <li>
              <span className="explain__num">1</span>
              <div><div className="explain__title">Route match</div><p className="explain__desc">The router resolves <span className="mono">/examples</span> to this module.</p></div>
            </li>
            <li>
              <span className="explain__num">2</span>
              <div><div className="explain__title">Loader</div><p className="explain__desc">Runs on the server with the request context.</p></div>
            </li>
            <li>
              <span className="explain__num">3</span>
              <div><div className="explain__title">Serialize</div><p className="explain__desc">Loader data is embedded in <span className="mono">#__FROST_DATA__</span>.</p></div>
            </li>
            <li>
              <span className="explain__num">4</span>
              <div><div className="explain__title">Render</div><p className="explain__desc">React renders the page to an HTML string.</p></div>
            </li>
            <li>
              <span className="explain__num">5</span>
              <div><div className="explain__title">Paint</div><p className="explain__desc">The browser shows complete, styled HTML before JavaScript runs.</p></div>
            </li>
          </ol>
        </div>
      </div>

      <div className="demo-span-5">
        <CodePanel filename="src/app/examples/page.tsx" code={SSR_SOURCE} />
      </div>
    </div>
  );
}

function HydrationPanel(): React.JSX.Element {
  return (
    <div>
      <HydrationInspector />
      <div className="panel">
        <div className="panel__title" style={{ marginBottom: "var(--space-4)" }}>How hydration works here</div>
        <ol className="explain">
          <li>
            <span className="explain__num">1</span>
            <div><div className="explain__title">Embedded state</div><p className="explain__desc">The server embeds route state as JSON in a script tag.</p></div>
          </li>
          <li>
            <span className="explain__num">2</span>
            <div><div className="explain__title">Same modules</div><p className="explain__desc">The client entry imports the same page and layout modules.</p></div>
          </li>
          <li>
            <span className="explain__num">3</span>
            <div><div className="explain__title">hydrateRoot</div><p className="explain__desc">Reuses the server-rendered DOM instead of replacing it.</p></div>
          </li>
          <li>
            <span className="explain__num">4</span>
            <div><div className="explain__title">Live state</div><p className="explain__desc">Event handlers attach and React state becomes live — the DOM is never rebuilt.</p></div>
          </li>
        </ol>
      </div>
      <div style={{ marginTop: "var(--space-6)" }}>
        <CodePanel filename="packages/react/src/client.tsx" code={HYDRATION_SOURCE} />
      </div>
    </div>
  );
}

function ApiPanel(): React.JSX.Element {
  return (
    <div>
      <ApiClientDemo />
      <div className="panel">
        <div className="panel__title" style={{ marginBottom: "var(--space-4)" }}>Available endpoints</div>
        <div className="kv">
          <div className="kv__row"><span className="kv__key">GET</span><span className="kv__value">/api/health</span></div>
          <div className="kv__row"><span className="kv__key">POST</span><span className="kv__value">/api/echo</span></div>
          <div className="kv__row"><span className="kv__key">GET</span><span className="kv__value">/api/records</span></div>
        </div>
        <p className="body-sm" style={{ marginTop: "var(--space-4)" }}>
          API routes live in <span className="mono">src/api/</span> and dispatch
          through the same request handler as pages. The DELETE request above
          intentionally returns 405 to show error states.
        </p>
      </div>
    </div>
  );
}

function BoundariesPanel({ data }: { data: ExamplesLoaderData }): React.JSX.Element {
  return (
    <div className="demo-grid">
      <div className="demo-span-7">
        <div className="panel">
          <div className="panel__head">
            <div>
              <div className="panel__title">Privileged records</div>
              <div className="panel__note">{data.recordsSource}</div>
            </div>
          </div>
          <div>
            {data.records.map((record) => (
              <div key={record.id} className="record-row">
                <div>
                  <div className="record-row__name">{record.name}</div>
                  <div className="record-row__id">{record.id}</div>
                </div>
                <span className="tag">{record.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel__title" style={{ marginBottom: "var(--space-3)" }}>The boundary</div>
          <p className="body-sm">
            <span className="mono">database.server.ts</span> strips secret fields
            before data leaves the server. If a client component tried to import it
            directly, the Vite plugin rejects the build with error FS1004.
          </p>
        </div>
      </div>

      <div className="demo-span-5">
        <CodePanel filename="FS1004 — boundary violation" code={BOUNDARY_SOURCE} />
      </div>
    </div>
  );
}
