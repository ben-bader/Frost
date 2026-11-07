import React from "react";
import type { Route } from "@frostjs/core";
import { useLoaderData, usePathname } from "@frostjs/react";
import { FrostMotif } from "../components/FrostMotif.js";
import { CopyButton } from "../components/CopyButton.js";

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
  description:
    "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
};

const installCommand = "npm create frost@latest";

const indexTopics = [
  { title: "React App", desc: "Start from a single entry that renders on server and client.", href: "/examples" },
  { title: "Router", desc: "File-based routes with typed contracts.", href: "/examples" },
  { title: "Loaders", desc: "Fetch data on the server before render.", href: "/examples" },
  { title: "Runtime", desc: "Inspect mode, server state, and boundaries at any time.", href: "/playground" },
  { title: "SSR + Hydration", desc: "Complete HTML first, interactivity where you opt in.", href: "/examples" },
  { title: "Adapter", desc: "Deploy to Node or any compatible host.", href: "/playground" },
];

export default function OverviewPage({ data }: Route.ComponentProps<OverviewLoaderData>): React.JSX.Element {
  const pageData = data ?? useLoaderData<OverviewLoaderData>();
  const pathname = usePathname();
  const route = pathname || "/";

  return (
    <>
      {/* Hero — base band; console sits inside it as the product surface */}
      <section className="band band--void" aria-labelledby="hero-title">
        <div className="wrap hero">
          <div className="hero__grid">
            <div className="hero__copy">
              <p className="eyebrow">Server-rendered React runtime</p>
              <h1 className="display" id="hero-title">
                React rendering. Web-native runtime.
              </h1>
              <p className="hero__lede">
                Frost keeps execution explicit. Server loaders, client hydration,
                route contracts, and runtime boundaries stay visible, testable,
                and predictable.
              </p>
              <div className="actions">
                <a href="/examples" className="btn btn--primary">
                  Start with examples <span aria-hidden="true">→</span>
                </a>
                <a href="#how" className="btn btn--secondary">
                  Read the architecture
                </a>
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

          {/* Runtime console — the only bordered panel on the page */}
          <div className="console" style={{ marginTop: "var(--space-8)" }}>
            <div className="console__bar">
              <span>frost dev</span>
              <span>{route}</span>
            </div>
            <div className="console__status">
              <span className="console__item">
                <span className="console__key">mode</span>
                <span className="console__value">{pageData.environment || "development"}</span>
              </span>
              <span className="console__item">
                <span className="console__key">server</span>
                <span className="console__value">
                  <span className="status-dot" aria-hidden="true" />
                  online
                </span>
              </span>
              <span className="console__item">
                <span className="console__key">render</span>
                <span className="console__value">SSR + hydration</span>
              </span>
              <span className="console__item">
                <span className="console__key">node</span>
                <span className="console__value">{pageData.nodeVersion || "—"}</span>
              </span>
            </div>
            <div className="console__log" tabIndex={0} role="log" aria-label="Request lifecycle log">
              <span className="ts">[00:00.000]</span>  GET {route.padEnd(24, " ")} request received{"\n"}
              <span className="ts">[00:00.004]</span>  loader  routes/index        resolved  4ms{"\n"}
              <span className="ts">[00:00.011]</span>  render  &lt;Index /&gt;           SSR complete{"\n"}
              <span className="ts">[00:00.012]</span>  html    18.4 kB               streamed{"\n"}
              <span className="ts">[00:00.140]</span>  hydrate &lt;Runtime /&gt;         client takeover{" "}
              <span className="ok">✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — lifted band, ruled blocks */}
      <section className="band band--base band--rule-b" id="how" aria-labelledby="how-title">
        <div className="wrap band__inner">
          <div className="section-head">
            <h2 className="section-title" id="how-title">
              How a request moves through Frost
            </h2>
          </div>
          <div className="steps">
            <div className="step">
              <div className="step__num">01</div>
              <div className="step__title">Loaders run on the server.</div>
              <p className="step__desc">Data is requested per route, before render.</p>
            </div>
            <div className="step">
              <div className="step__num">02</div>
              <div className="step__title">Components render once on the server.</div>
              <p className="step__desc">The HTML arrives complete.</p>
            </div>
            <div className="step">
              <div className="step__num">03</div>
              <div className="step__title">Hydration is explicit.</div>
              <p className="step__desc">The browser takes over only where you ask.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Topics index — base band */}
      <section className="band band--lift" aria-labelledby="index-title">
        <div className="wrap band__inner">
          <div className="section-head">
            <h2 className="section-title" id="index-title">
              Explore Frost
            </h2>
          </div>
          <div className="index-grid">
            {indexTopics.map((topic) => (
              <a key={topic.title} href={topic.href} className="index-row">
                <span>
                  <span className="index-row__title">{topic.title}</span>
                  <span className="index-row__desc">{topic.desc}</span>
                </span>
                <span className="index-row__arrow" aria-hidden="true">
                  →
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
