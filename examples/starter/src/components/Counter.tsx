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
    <section className="panel" aria-labelledby="counter-title">
      <div className="panel__head">
        <div>
          <h2 className="panel__title" id="counter-title">Counter</h2>
          <p className="panel__note">Standard React state after hydration.</p>
        </div>
        <span className="tag">{hydrated ? "hydrated" : "pending"}</span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-7) 0",
          borderTop: "var(--rule)",
          borderBottom: "var(--rule)",
          marginBottom: "var(--space-5)",
        }}
      >
        <span
          className="mono"
          style={{
            fontSize: "3rem",
            fontWeight: 500,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn--small" onClick={() => setCount((c) => c - step)}>
          −{step}
        </button>
        <button type="button" className="btn btn--primary btn--small" onClick={() => setCount((c) => c + step)}>
          +{step}
        </button>
        <button type="button" className="btn btn--small" onClick={() => setCount(0)}>
          Reset
        </button>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className="body-sm">step</span>
          {[1, 5, 10].map((s) => (
            <button
              key={s}
              type="button"
              className={`endpoint-btn${step === s ? " endpoint-btn--active" : ""}`}
              onClick={() => setStep(s)}
            >
              {s}
            </button>
          ))}
        </span>
      </div>
    </section>
  );
}
