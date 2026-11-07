import React, { useEffect, useState } from "react";
import type { Route } from "@frostjs/core";
import { Panel } from "../../components/Panel.js";
import { ClientIsland } from "../../components/ClientIsland.js";

// Loader + component live in this file; the client island is src/components/ClientIsland.tsx.

const ALLOWED_DELAYS = [0, 300, 1000, 2000] as const;
const DEFAULT_DELAY = 300;

export interface PlaygroundLoaderData {
  name: string;
  delay: number;
  node: string;
  receivedAt: string;
  elapsedMs: number;
  log: string[];
}

const stamp = () => new Date().toISOString().slice(11, 23);

export async function loader({ url, request }: Route.LoaderArgs): Promise<PlaygroundLoaderData> {
  const t0 = Date.now();
  const log: string[] = [];

  // Real request line, exactly as received
  log.push(`[${stamp()}] request received ${request.method} ${url.pathname}${url.search || ""}`);

  // Parse + sanitize inputs
  const rawName = (url.searchParams.get("name") ?? "").trim();
  const name = (rawName || "world").slice(0, 32);
  const rawDelay = url.searchParams.get("delay");
  let delay = DEFAULT_DELAY;
  let delayNote = "";
  if (rawDelay !== null) {
    const parsed = Number(rawDelay);
    if ((ALLOWED_DELAYS as readonly number[]).includes(parsed)) {
      delay = parsed;
    } else {
      delayNote = " — invalid delay ignored, using 300";
    }
  }
  log.push(`[${stamp()}] inputs parsed name="${name}" delay=${rawDelay ?? "default"}${delayNote}`);

  log.push(`[${stamp()}] loader started (delay ${delay}ms)`);
  await new Promise((resolve) => setTimeout(resolve, delay));
  const elapsedMs = Date.now() - t0;
  log.push(`[${stamp()}] loader resolved in ${elapsedMs}ms`);

  return {
    name,
    delay,
    node: process.version,
    receivedAt: new Date(t0).toISOString(),
    elapsedMs,
    log,
  };
}

export const metadata: Route.Metadata = {
  title: "Playground — Frost",
  description: "Send a request through the Frost loader and watch it render.",
};

// Client island: appends the measured hydration line inside the console <pre>.
function HydrationLine(): React.JSX.Element | null {
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    const ms = Math.round(performance.now());
    setLine(`\n[${new Date().toISOString().slice(11, 23)}] client hydrated ${ms} ms after load`);
  }, []);
  return line ? <>{line}</> : null;
}

// Minimal JSON view: keys body, strings hi, numbers accent.
function JsonView({ value }: { value: unknown }): React.JSX.Element {
  const json = JSON.stringify(value, null, 2);
  return (
    <pre className="data-pre">
      {json.split("\n").map((l, i) => {
        const m = l.match(/^(\s*)"([^"]+)":\s*(.*)$/);
        if (!m || m[3] === undefined) {
          return <React.Fragment key={i}>{l}{"\n"}</React.Fragment>;
        }
        const [, indent = "", key = "", rest] = m;
        const valMatch = rest.match(/^(".*")|(\d[\d.eE+-]*)|(true|false|null)/);
        const val = valMatch?.[0] ?? rest;
        const cls = val.startsWith('"') ? "s" : /^\d/.test(val) ? "n" : "";
        return (
          <React.Fragment key={i}>
            {indent}<span className="k">"{key}"</span>: <span className={cls}>{val}</span>
            {rest.slice(val.length)}{"\n"}
          </React.Fragment>
        );
      })}
    </pre>
  );
}

export default function PlaygroundPage({ data }: Route.ComponentProps<PlaygroundLoaderData>): React.JSX.Element {
  const pageData = data;
  const requestLine = `GET /playground?name=${encodeURIComponent(pageData?.name ?? "world")}&delay=${pageData?.delay ?? DEFAULT_DELAY}`;

  return (
    <>
      <div className="wrap">
        <div className="page-head">
          <p className="eyebrow">Playground</p>
          <h1 className="page-title">Send a request. Watch it render.</h1>
          <p className="page-lede">
            Change the inputs, run the request, and see the server loader, the
            rendered data, and the client takeover in one place.
          </p>
        </div>
      </div>

      <section className="section section--tight" aria-label="Request tool">
        <div className="wrap section__inner">
          <div className="pg__grid">
            {/* Request — plain GET form, works without JavaScript */}
            <div className="pg__request">
              <Panel title="request">
                <form method="get" action="/playground">
                  <div className="field">
                    <label className="field__label" htmlFor="name">Name</label>
                    <input
                      className="field__input"
                      id="name"
                      name="name"
                      type="text"
                      defaultValue={pageData?.name ?? "world"}
                      maxLength={32}
                    />
                  </div>
                  <div className="field">
                    <label className="field__label" htmlFor="delay">Loader delay</label>
                    <select
                      className="field__select"
                      id="delay"
                      name="delay"
                      defaultValue={String(pageData?.delay ?? DEFAULT_DELAY)}
                    >
                      {ALLOWED_DELAYS.map((d) => (
                        <option key={d} value={d}>{d} ms</option>
                      ))}
                    </select>
                  </div>
                  <div className="form__row">
                    <button type="submit" className="btn btn--primary">Run request</button>
                    <a className="text-link" href="/playground">Reset</a>
                  </div>
                </form>
                <div className="request-line">{requestLine}</div>
              </Panel>
            </div>

            {/* Response stack */}
            <div className="pg__response">
              <Panel title="console" flush>
                <pre className="console-pre" tabIndex={0} aria-label="Request console">
                  {pageData?.log.map((line, i) => (
                    <React.Fragment key={i}>
                      <span className="ts">{line.slice(0, 14)}</span>
                      {line.slice(14)}{"\n"}
                    </React.Fragment>
                  ))}
                  <HydrationLine />
                </pre>
              </Panel>

              <Panel title="loader data" flush>
                {pageData ? <JsonView value={pageData} /> : null}
              </Panel>

              <Panel title="client island">
                <ClientIsland />
              </Panel>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
