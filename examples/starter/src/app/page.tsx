import React from "react";
import type { Route } from "@frostjs/core";
import { useLoaderData, usePathname } from "@frostjs/react";
import { FrostMotif } from "../components/FrostMotif.js";
import { CopyButton } from "../components/CopyButton.js";
import { siteHead } from "./head.js";

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
  title: "Frost — React rendering, web-native runtime",
  description: "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
  ...siteHead,
};

const installCommand = "npm create frost@latest";

const indexTopics = [
  { title: "React App", desc: "Components render on the server, then hydrate in the browser.", href: "/examples" },
  { title: "Router", desc: "File-based routes with typed contracts.", href: "/examples" },
  { title: "Loaders", desc: "Data is fetched per route, before render, on the server.", href: "/examples" },
  { title: "Runtime", desc: "One request lifecycle: match, load, render, respond.", href: "/playground" },
  { title: "SSR + Hydration", desc: "Complete HTML first; the client takes over where you ask.", href: "/examples" },
  { title: "Adapter", desc: "Web-standard Request/Response, hosted by the Node adapter.", href: "/playground" },
];

const ROUTE_SOURCE = `import { getRuntimeStats } from "./runtime.server";

export async function loader({ request }) {
  const stats = await getRuntimeStats(request);
  return { stats };
}

export default function Index({ data }) {
  return (
    <main>
      <h1>Server-rendered. Hydrated on demand.</h1>
      <Runtime stats={data.stats} />
    </main>
  );
}`;

function RouteSource(): React.JSX.Element {
  return (
    <pre>
      <code>
        <span className="tok-k">import</span> {"{ getRuntimeStats }"} <span className="tok-k">from</span>{" "}
        <span className="tok-s">"./runtime.server"</span>;
        {"\n\n"}
        <span className="tok-c">// loaders run on the server, before render</span>
        {"\n"}
        <span className="tok-k">export async function</span> <span className="tok-f">loader</span>
        {"({ request }) {\n  "}
        <span className="tok-k">const</span> stats = <span className="tok-k">await</span>{" "}
        <span className="tok-f">getRuntimeStats</span>(request);
        {"\n  "}
        <span className="tok-k">return</span> {"{ stats }"};
        {"\n}\n\n"}
        <span className="tok-k">export default function</span> <span className="tok-f">Index</span>
        {"({ data }) {\n  "}
        <span className="tok-k">return</span> (
        {"\n    "}
        <span className="tok-f">&lt;main&gt;</span>
        {"\n      "}
        <span className="tok-f">&lt;h1&gt;</span>Server-rendered. Hydrated on demand.
        <span className="tok-f">&lt;/h1&gt;</span>
        {"\n      "}
        <span className="tok-f">&lt;Runtime</span> stats={"{data.stats}"} <span className="tok-f">/&gt;</span>
        {"\n    "}
        <span className="tok-f">&lt;/main&gt;</span>
        {"\n  );\n}"}
      </code>
    </pre>
  );
}

export default function OverviewPage({ data }: Route.ComponentProps<OverviewLoaderData>): React.JSX.Element {
  const pageData = data ?? useLoaderData<OverviewLoaderData>();
  const pathname = usePathname();

  return (
    <>
      {/* Hero — abyss band */}
      <section className="band--abyss hero" aria-labelledby="hero-title">
        <div className="wrap">
          <div className="hero__grid">
            <div className="hero__copy">
              <h1 className="display" id="hero-title">
                React rendering, web-native runtime.
              </h1>
              <p className="hero__lede">
                Frost keeps execution explicit. Server loaders, client hydration,
                route contracts, and runtime boundaries stay visible, testable,
                and predictable.
              </p>
              <div className="actions">
                <a href="/examples" className="btn btn--primary">Start with examples</a>
                <a href="#code" className="btn btn--secondary">Read the architecture</a>
              </div>
              <p className="install">
                <code className="install__cmd">{installCommand}</code>
                <CopyButton text={installCommand} label="Copy install command" />
              </p>
            </div>
            <div className="hero__visual">
              <FrostMotif />
            </div>
          </div>
        </div>
      </section>

      {/* Runtime strip — trench band, rules above and below */}
      <section className="band band--trench band--rule-b" aria-label="Runtime status">
        <div className="wrap" style={{ paddingTop: "var(--space-5)", paddingBottom: "var(--space-5)" }}>
          <div className="runtime-strip">
            <span className="runtime-strip__item">
              <span className="runtime-strip__key">mode</span>
              <span className="runtime-strip__value">{pageData.environment || "development"}</span>
            </span>
            <span className="runtime-strip__item">
              <span className="runtime-strip__key">server</span>
              <span className="runtime-strip__value">
                <span className="status-dot" aria-hidden="true" />online
              </span>
            </span>
            <span className="runtime-strip__item">
              <span className="runtime-strip__key">render</span>
              <span className="runtime-strip__value">SSR + hydration</span>
            </span>
            <span className="runtime-strip__item">
              <span className="runtime-strip__key">node</span>
              <span className="runtime-strip__value">{pageData.nodeVersion || "—"}</span>
            </span>
            <span className="runtime-strip__item">
              <span className="runtime-strip__key">route</span>
              <span className="runtime-strip__value">{pathname}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Code — deep band (top rule comes from the trench band's bottom) */}
      <section className="band--deep" id="code" aria-labelledby="code-title">
        <div className="wrap band__inner">
          <div className="section-head">
            <h2 className="section-title" id="code-title">A route, start to finish.</h2>
            <p className="section-sub">
              The loader runs on the server. The component renders to HTML.
              The browser hydrates the same tree. Nothing is implicit.
            </p>
          </div>
          <div className="section-grid">
            <div className="span-7">
              <div className="code-panel">
                <div className="code-panel__bar">
                  <span>routes/index.tsx</span>
                  <CopyButton text={ROUTE_SOURCE} label="Copy code" />
                </div>
                <div className="code-panel__body" tabIndex={0} aria-label="Code example">
                  <RouteSource />
                </div>
              </div>
            </div>
            <div className="span-4">
              <ol className="explain">
                <li>
                  <span className="explain__num">01</span>
                  <div>
                    <div className="explain__title">Loaders run on the server.</div>
                    <p className="explain__desc">Data is requested per route, before render.</p>
                  </div>
                </li>
                <li>
                  <span className="explain__num">02</span>
                  <div>
                    <div className="explain__title">Components render once on the server.</div>
                    <p className="explain__desc">The HTML arrives complete.</p>
                  </div>
                </li>
                <li>
                  <span className="explain__num">03</span>
                  <div>
                    <div className="explain__title">Hydration is explicit.</div>
                    <p className="explain__desc">The browser takes over only where you ask.</p>
                  </div>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Topics index — abyss band */}
      <section className="band band--abyss" aria-labelledby="index-title">
        <div className="wrap band__inner">
          <div className="section-head">
            <h2 className="section-title" id="index-title">Explore Frost.</h2>
          </div>
          <div className="index-grid">
            {indexTopics.map((topic) => (
              <a key={topic.title} href={topic.href} className="index-row">
                <span>
                  <span className="index-row__title">{topic.title}</span>
                  <span className="index-row__desc">{topic.desc}</span>
                </span>
                <span className="index-row__arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
