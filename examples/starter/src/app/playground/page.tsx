import React, { useState } from "react";
import type { Route } from "@frostjs/core";
import { FrostErrorBoundary, FrostErrorFallback } from "@frostjs/react";
import { Counter } from "../../components/Counter.js";
import { CopyButton } from "../../components/CopyButton.js";


export const metadata: Route.Metadata = {
  title: "Playground — Frost",
  description: "Interactive runtime demos and the Frost error lab.",
  
};

function BrokenExample(): React.JSX.Element {
  throw new Error("Frost example rendering failed intentionally.");
}

const ERROR_SOURCE = `function BrokenExample() {
  throw new Error(
    "Frost example rendering failed intentionally."
  );
}

<FrostErrorBoundary>
  {crashArmed ? <BrokenExample /> : <Stable />}
</FrostErrorBoundary>`;

interface RecordsState {
  loading: boolean;
  status: number | null;
  body: unknown;
  error: string | null;
}

function RecordsLoader(): React.JSX.Element {
  const [state, setState] = useState<RecordsState>({ loading: false, status: null, body: null, error: null });

  const load = async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch("/api/records");
      const body = await res.json();
      setState({ loading: false, status: res.status, body, error: null });
    } catch (err) {
      setState({ loading: false, status: null, body: null, error: err instanceof Error ? err.message : "Request failed" });
    }
  };

  return (
    <section className="panel" aria-labelledby="records-title">
      <div className="panel__head">
        <div>
          <h2 className="panel__title" id="records-title">Client data loading</h2>
          <p className="panel__note">
            Fetches <span className="mono">/api/records</span> from the browser after hydration.
          </p>
        </div>
        {state.status !== null && <span className="tag">{state.status}</span>}
      </div>
      <div className="btn-row" style={{ marginBottom: state.body || state.error ? "var(--space-4)" : 0 }}>
        <button type="button" className="btn btn--primary btn--small" onClick={load} disabled={state.loading}>
          {state.loading ? "Loading…" : "Load records"}
        </button>
      </div>
      {state.error && <p className="mono text-danger" style={{ marginBottom: "var(--space-3)" }}>{state.error}</p>}
      {state.body !== null && (
        <pre className="code-block--wrap" style={{ background: "var(--background-deep)", border: "var(--rule)", borderRadius: "var(--radius)", padding: "var(--space-4)", overflowX: "auto", maxHeight: 240 }}>{JSON.stringify(state.body, null, 2)}</pre>
      )}
    </section>
  );
}

export default function PlaygroundPage(): React.JSX.Element {
  const [crashArmed, setCrashArmed] = useState(false);

  return (
    <section className="band band--lift">
      <div className="wrap band__inner">
      <div className="page-head">
        <h1 className="page-title">Poke the runtime.</h1>
        <p className="page-lede">
          Interactive demos and a deliberate render failure — the error boundary
          catches it and shows the diagnostic dialog.
        </p>
      </div>

      <div className="demo-grid">
        <div className="demo-span-7">
          <Counter initialCount={7} />
          <RecordsLoader />
        </div>

        <div className="demo-span-5">
          <section className="panel" aria-labelledby="error-title">
            <div className="panel__head">
              <div>
                <h2 className="panel__title" id="error-title">Error lab</h2>
                <p className="panel__note">
                  <span className="mono">BrokenExample</span> throws during render.
                  The boundary isolates the failure — dismissing it restores this panel.
                </p>
              </div>
            </div>
            <FrostErrorBoundary
              fallback={(error, reset) => (
                <FrostErrorFallback
                  error={error}
                  onReset={() => {
                    setCrashArmed(false);
                    reset();
                  }}
                />
              )}
            >
              {crashArmed ? (
                <BrokenExample />
              ) : (
                <div className="error-lab-target">
                  <p className="body-sm" style={{ marginBottom: "var(--space-5)" }}>
                    Render is stable. Trigger the failure to see the diagnostic overlay.
                  </p>
                  <button type="button" className="btn btn--small" onClick={() => setCrashArmed(true)}>
                    Trigger render error
                  </button>
                </div>
              )}
            </FrostErrorBoundary>
          </section>

          <div className="panel">
            <div className="panel__head">
              <div className="panel__title">Source</div>
              <CopyButton text={ERROR_SOURCE} label="Copy code" />
            </div>
            <pre className="code-block--wrap" style={{ background: "var(--background-deep)", border: "var(--rule)", borderRadius: "var(--radius)", padding: "var(--space-4)", overflowX: "auto" }}>{ERROR_SOURCE}</pre>
          </div>
        </div>
      </div>
      </div>
    </section>
  );
}
