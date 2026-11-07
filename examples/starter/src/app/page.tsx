import React from "react";
import type { Route } from "@frostjs/core";
import { Panel } from "../components/Panel.js";
import { CopyButton } from "../components/CopyButton.js";
import { HydrationFlag } from "../components/HydrationFlag.js";

// Loader + component live in this file; shared chrome in src/components/.

export interface DemoLoaderData {
  renderedAt: string;
  nodeVersion: string;
  environment: string;
  route: string;
}

export async function loader({ url }: Route.LoaderArgs): Promise<DemoLoaderData> {
  return {
    renderedAt: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    route: url.pathname,
  };
}

export const metadata: Route.Metadata = {
  title: "Frost — React rendering, web-native runtime",
  description:
    "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
};

const runtimeStatic = {
  // Static label only — every value row comes from the loader or the client.
  serverStatus: "online",
};

const steps = [
  {
    num: "01",
    title: "Loaders run on the server.",
    desc: "Data is requested per route, before render.",
  },
  {
    num: "02",
    title: "Components render once on the server.",
    desc: "The HTML arrives complete.",
  },
  {
    num: "03",
    title: "Hydration is explicit.",
    desc: "The browser takes over only where you ask.",
  },
];

const commands = [
  { cmd: "pnpm install", note: "install" },
  { cmd: "pnpm --filter frost-starter-example dev", note: "dev" },
  { cmd: "pnpm --filter frost-starter-example build", note: "build" },
  { cmd: "pnpm --filter frost-starter-example start", note: "start" },
];

// Mirrors the real starter tree (src/ + root config files).
const fileTree: Array<{ depth: number; name: string; comment?: string }> = [
  { depth: 0, name: "src/" },
  { depth: 1, name: "app/" },
  { depth: 2, name: "layout.tsx", comment: "# header + footer shell" },
  { depth: 2, name: "page.tsx", comment: "# demo page" },
  { depth: 2, name: "playground/" },
  { depth: 3, name: "page.tsx", comment: "# playground" },
  { depth: 1, name: "components/" },
  { depth: 2, name: "Header.tsx" },
  { depth: 2, name: "Footer.tsx" },
  { depth: 2, name: "Panel.tsx" },
  { depth: 2, name: "CopyButton.tsx" },
  { depth: 2, name: "ClientIsland.tsx" },
  { depth: 2, name: "HydrationFlag.tsx" },
  { depth: 1, name: "styles/" },
  { depth: 2, name: "theme.css", comment: "# design tokens" },
  { depth: 0, name: "frost.config.ts", comment: "# frost configuration" },
  { depth: 0, name: "package.json", comment: "# scripts + dependencies" },
];

const cuePositions = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function DemoPage({ data }: Route.ComponentProps<DemoLoaderData>): React.JSX.Element {
  const pageData = data;
  // UTC slice — deterministic across server and client (no locale drift)
  const renderedTime = pageData?.renderedAt ? pageData.renderedAt.slice(11, 19) + " UTC" : "—";

  return (
    <>
      {/* Hero — centered stack, atmosphere is the only backdrop */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="wrap">
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
            <div className="hero__actions" style={{ "--i": 4 } as React.CSSProperties}>
              <a className="btn btn--primary" href="/playground">Open playground</a>
              <a className="btn btn--secondary" href="#start">Run it locally</a>
            </div>
            <a
              className="cue hero__cue"
              href="#overview"
              aria-label="Scroll to overview"
              style={{ "--i": 5 } as React.CSSProperties}
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

      {/* Overview — copy left, ruled runtime blocks right, steps below */}
      <section className="section" id="overview" aria-labelledby="overview-title">
        <div className="wrap section__inner section__inner--inset">
          <div className="split__grid">
            <div className="split__copy">
              <p className="eyebrow">Explicit by design</p>
              <h2 className="section-title" id="overview-title">
                Explicit execution, from the first request to browser takeover.
              </h2>
              <p className="section__lede">
                Request-driven loaders, explicit server boundaries, and
                deterministic hydration keep the runtime understandable from
                first render to browser takeover.
              </p>
            </div>

            <div className="split__blocks">
              <div className="ruled">
                <div className="ruled__title">Runtime</div>
                <dl className="kv">
                  <div className="kv__row">
                    <dt className="kv__key">server</dt>
                    <dd className="kv__value">
                      <span className="status-dot" aria-hidden="true" />
                      {runtimeStatic.serverStatus}
                    </dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">mode</dt>
                    <dd className="kv__value">{pageData?.environment || "—"}</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">node</dt>
                    <dd className="kv__value">{pageData?.nodeVersion || "—"}</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">route</dt>
                    <dd className="kv__value">{pageData?.route || "/"}</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">rendered</dt>
                    <dd className="kv__value">{renderedTime}</dd>
                  </div>
                  <div className="kv__row">
                    <dt className="kv__key">hydrated</dt>
                    <dd className="kv__value">
                      <HydrationFlag />
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="ruled ruled--text">
                SSR + hydration. Complete HTML first, interactivity where you opt in.
              </p>
            </div>
          </div>

          <div className="steps">
            {steps.map((step) => (
              <div key={step.num} className="ruled">
                <div className="step__num">{step.num}</div>
                <div className="step__title">{step.title}</div>
                <p className="step__desc">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Start — commands + real file tree */}
      <section className="section section--tight" id="start" aria-labelledby="start-title">
        <div className="wrap section__inner">
          <p className="eyebrow">Get started</p>
          <h2 className="section-title" id="start-title">
            Run it in a few commands.
          </h2>
          <div className="start__grid">
            <div className="start__col">
              <Panel title="commands">
                {commands.map((c) => (
                  <div key={c.cmd} className="cmd-row">
                    <code className="cmd-row__cmd">{c.cmd}</code>
                    <CopyButton text={c.cmd} label={`Copy ${c.note} command`} />
                  </div>
                ))}
              </Panel>
            </div>
            <div className="start__col">
              <Panel title="project" flush>
                <div className="panel__body">
                  <div className="file-tree">
                    {fileTree.map((row, i) => (
                      <div key={i} style={{ paddingLeft: `${row.depth * 20}px` }}>
                        <span className={row.name.endsWith("/") ? "file-tree__dir" : ""}>{row.name}</span>
                        {row.comment && <span className="file-tree__comment"> {row.comment}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
