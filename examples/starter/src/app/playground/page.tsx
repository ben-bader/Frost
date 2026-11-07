import React, { useState } from "react";
import type { Route } from "@frostjs/core";
import { FrostErrorBoundary, FrostErrorFallback } from "@frostjs/react";
import { Counter } from "../../components/Counter.js";

export const metadata: Route.Metadata = {
  title: "Playground — Frost Framework",
  description: "Interactive runtime demos and the Frost error lab.",
};

function BrokenExample(): React.JSX.Element {
  throw new Error("Frost example rendering failed intentionally.");
}

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
    <div className="surface">
      <div className="surface__head">
        <div>
          <h3 className="h3">Client data loading</h3>
          <p className="body" style={{ fontSize: "0.8rem", marginTop: 2 }}>
            Fetches <span className="code-inline">/api/records</span> from the browser after hydration.
          </p>
        </div>
        {state.status !== null && <span className={`pill ${state.status < 400 ? "pill--success" : "pill--danger"}`}>{state.status}</span>}
      </div>
      <div className="btn-row" style={{ marginBottom: state.body || state.error ? "var(--space-4)" : 0 }}>
        <button type="button" className="btn btn--primary" onClick={load} disabled={state.loading}>
          {state.loading ? "Loading…" : "Load records"}
        </button>
      </div>
      {state.error && <div className="pill pill--danger" style={{ display: "flex", width: "fit-content", marginBottom: "var(--space-3)" }}>{state.error}</div>}
      {state.body !== null && (
        <pre className="code-block code-block--wrap" style={{ maxHeight: 240 }}>{JSON.stringify(state.body, null, 2)}</pre>
      )}
    </div>
  );
}

export default function PlaygroundPage(): React.JSX.Element {
  const [crashArmed, setCrashArmed] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{ paddingTop: "var(--space-6)", marginBottom: "var(--space-8)" }}>
        <div className="meta" style={{ marginBottom: "var(--space-2)" }}>Playground</div>
        <h1 className="h1">Poke the runtime.</h1>
        <p className="lede" style={{ marginTop: "var(--space-4)", fontSize: "0.95rem" }}>
          Interactive demos and a deliberate render failure — the error boundary
          catches it and shows the diagnostic dialog.
        </p>
      </div>

      <div className="grid-split">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <Counter initialCount={7} />
          <RecordsLoader />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
          <div className="surface surface--code">
            <div className="meta" style={{ marginBottom: "var(--space-3)" }}>Error lab</div>
            <p className="body" style={{ fontSize: "0.82rem", marginBottom: "var(--space-4)" }}>
              <span className="code-inline">BrokenExample</span> throws during render.
              The boundary below isolates the failure — dismissing it restores this panel.
            </p>
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
                <div
                  style={{
                    border: "1px dashed var(--status-danger-line)",
                    borderRadius: "var(--radius-medium)",
                    padding: "var(--space-6)",
                    textAlign: "center",
                    background: "var(--status-danger-soft)",
                  }}
                >
                  <div className="meta" style={{ marginBottom: "var(--space-3)", color: "var(--status-danger)" }}>armed component</div>
                  <p className="body" style={{ fontSize: "0.82rem", marginBottom: "var(--space-4)" }}>
                    Render is stable. Trigger the failure to see the diagnostic overlay.
                  </p>
                  <button type="button" className="btn btn--danger" onClick={() => setCrashArmed(true)}>
                    Trigger render error
                  </button>
                </div>
              )}
            </FrostErrorBoundary>
          </div>

          <div className="surface">
            <div className="meta" style={{ marginBottom: "var(--space-3)" }}>Source</div>
            <pre className="code-block code-block--wrap">{`function BrokenExample() {
  throw new Error(
    "Frost example rendering failed intentionally."
  );
}

<FrostErrorBoundary>
  {crashArmed ? <BrokenExample /> : <Stable />}
</FrostErrorBoundary>`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
