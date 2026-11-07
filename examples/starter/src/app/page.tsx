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
  title: "Frost — React rendering, web-native runtime",
  description:
    "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
};

const topics = [
  { title: "React App", desc: "Start from a single entry that renders on server and client.", href: "/examples" },
  { title: "Router", desc: "File-based routes with typed contracts.", href: "/examples" },
  { title: "Loaders", desc: "Fetch data on the server before render.", href: "/examples" },
  { title: "Runtime", desc: "Inspect mode, server state, and boundaries at any time.", href: "/playground" },
  { title: "SSR + Hydration", desc: "Complete HTML first, interactivity where you opt in.", href: "/examples" },
  { title: "Adapter", desc: "Deploy to Node or any compatible host.", href: "/playground" },
];

// 3x3 dot matrix with the top-left and bottom-right positions left empty
const cuePositions = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function OverviewPage({ data }: Route.ComponentProps<OverviewLoaderData>): React.JSX.Element {
  const pageData = data ?? useLoaderData<OverviewLoaderData>();
  const pathname = usePathname();
  const route = pathname || "/";

  return (
    <>
      {/* Hero — glass shape behind the centered stack */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap hero__stage">
          <picture>
            <source srcSet="/Translucent_Teal_Bubble_Cluster.webp" type="image/webp" />
            <img
              className="hero__shape"
              src="/Translucent%20Teal%20Bubble%20Cluster.png"
              alt=""
              aria-hidden="true"
              width={1536}
              height={1024}
              decoding="async"
            />
          </picture>
          <div className="hero__stack">
            <span className="hero__rule" style={{ "--i": 0 } as React.CSSProperties} />
            <p className="eyebrow" style={{ "--i": 1 } as React.CSSProperties}>
              Frost framework.
            </p>
            <h1 className="display" id="hero-title" style={{ "--i": 2 } as React.CSSProperties}>
              React rendering. Web-native runtime.
            </h1>
            <p className="hero__lede" style={{ "--i": 3 } as React.CSSProperties}>
              Frost keeps execution explicit: server loaders, client hydration,
              route contracts, and runtime boundaries stay visible, testable,
              and predictable.
            </p>
            <a
              className="cue"
              href="#overview"
              aria-label="Scroll to overview"
              style={{ "--i": 4 } as React.CSSProperties}
            >
              {cuePositions.map((i) =>
                i === 0 || i === 8 ? (
                  <span key={i} aria-hidden="true" />
                ) : (
                  <span
                    key={i}
                    className="cue__dot"
                    style={{ "--d": `${(i % 3) * 120 + Math.floor(i / 3) * 200}ms` } as React.CSSProperties}
                  />
                )
              )}
            </a>
          </div>
        </div>
      </section>

      {/* Explicit by design — text left, ruled blocks right */}
      <section className="section" id="overview" aria-labelledby="split-title">
        <div className="wrap section__inner section__inner--inset">
          <div className="split__grid">
            <div className="split__copy">
              <p className="eyebrow eyebrow--lo">Explicit by design</p>
              <h2 className="section-title" id="split-title">
                Explicit execution, from the first request to browser takeover.
              </h2>
              <p className="section__lede">
                Request-driven loaders, explicit server boundaries, and
                deterministic hydration keep the runtime understandable from
                first render to browser takeover.
              </p>
              <div className="actions">
                <a className="btn btn--primary" href="/examples">Explore examples</a>
                <a className="btn btn--secondary" href="#runtime">Open architecture</a>
              </div>
            </div>

            <div className="split__blocks">
              <div className="ruled" id="runtime">
                <div className="ruled__title">Runtime</div>
                <dl className="kv">
                  <div className="kv__row">
                    <dt className="kv__key">mode</dt>
                    <dd className="kv__value">{pageData.environment || "development"}</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">server</dt>
                    <dd className="kv__value">
                      <span className="status-dot" aria-hidden="true" />
                      online
                    </dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">render</dt>
                    <dd className="kv__value">SSR + hydration</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">node</dt>
                    <dd className="kv__value">{pageData.nodeVersion || "—"}</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">route</dt>
                    <dd className="kv__value">{route}</dd>
                  </div>
                </dl>
              </div>
              <p className="ruled ruled--text">
                SSR + hydration. Complete HTML first, interactivity where you opt in.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Frost — ruled-block topic grid */}
      <section className="section" aria-labelledby="topics-title">
        <div className="wrap section__inner">
          <p className="eyebrow eyebrow--lo">Explore</p>
          <h2 className="section-title" id="topics-title">
            Everything in the runtime, one page each.
          </h2>
          <div className="topics">
            {topics.map((topic) => (
              <a key={topic.title} href={topic.href} className="topic">
                <span className="topic__body">
                  <span className="topic__title">{topic.title}</span>
                  <span className="topic__desc">{topic.desc}</span>
                </span>
                <span className="topic__arrow" aria-hidden="true">→</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
