import { useState, useEffect } from "react";

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps): React.JSX.Element {
  const [count, setCount] = useState(initialCount);
  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div className="surface">
      <div className="surface__head">
        <div>
          <h3 className="h3">Counter</h3>
          <p className="body" style={{ fontSize: "0.8rem", marginTop: 2 }}>
            Standard React state after hydration.
          </p>
        </div>
        <span className={`pill ${hydrated ? "pill--success" : "pill--warning"}`}>
          {hydrated ? "hydrated" : "pending"}
        </span>
      </div>

      <div
        className="surface surface--code"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          marginBottom: "var(--space-4)",
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: "3rem",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: count > 0 ? "var(--status-success)" : count < 0 ? "var(--status-danger)" : "var(--text-primary)",
          }}
        >
          {count}
        </span>
      </div>

      <div className="btn-row">
        <button type="button" className="btn" onClick={() => setCount((c) => c - step)}>
          −{step}
        </button>
        <button type="button" className="btn btn--primary" onClick={() => setCount((c) => c + step)}>
          +{step}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setCount(0)}>
          Reset
        </button>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="meta">step</span>
          {[1, 5, 10].map((s) => (
            <button
              key={s}
              type="button"
              className={`btn${step === s ? " btn--primary" : ""}`}
              style={{ height: 28, padding: "0 10px", fontSize: "0.72rem" }}
              onClick={() => setStep(s)}
            >
              {s}
            </button>
          ))}
        </span>
      </div>
    </div>
  );
}
