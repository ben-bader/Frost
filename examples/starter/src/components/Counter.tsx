import { useState, useEffect } from "react";

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps): React.JSX.Element {
  const [count, setCount] = useState(initialCount);
  const [step, setStep] = useState(1);
  const [history, setHistory] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const updateCount = (newCount: number, actionName: string) => {
    setCount(newCount);
    const timestamp = new Date().toLocaleTimeString();
    setHistory((prev) => [`[${timestamp}] ${actionName} -> ${newCount}`, ...prev.slice(0, 7)]);
  };

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Interactive React State
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            Powered by standard <code>useState</code> hooks inside hydrated React DOM.
          </p>
        </div>
        <span
          style={{
            fontSize: "0.72rem",
            background: hydrated ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)",
            color: hydrated ? "var(--accent-emerald)" : "var(--accent-amber)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontWeight: 600,
            border: `1px solid ${hydrated ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
          }}
        >
          {hydrated ? "● Hydrated & Interactive" : "○ Pre-Hydration"}
        </span>
      </div>

      {/* Main Counter Display */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px",
          background: "var(--bg-primary)",
          borderRadius: "10px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <span
          style={{
            fontSize: "3.5rem",
            fontWeight: 700,
            color: count > 0 ? "var(--accent-cyan)" : count < 0 ? "var(--accent-rose)" : "var(--text-primary)",
            fontFamily: "var(--font-mono)",
            letterSpacing: "-0.04em",
          }}
        >
          {count}
        </span>
      </div>

      {/* Control Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
        <button
          type="button"
          onClick={() => updateCount(count - step, `Decremented by ${step}`)}
          style={{
            background: "var(--bg-hover)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-subtle)",
            padding: "10px 18px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.95rem",
            transition: "all 0.15s ease",
          }}
        >
          - {step}
        </button>

        <button
          type="button"
          onClick={() => updateCount(count + step, `Incremented by ${step}`)}
          style={{
            background: "var(--accent-blue)",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.95rem",
            transition: "all 0.15s ease",
          }}
        >
          + {step}
        </button>

        <button
          type="button"
          onClick={() => updateCount(0, "Reset to 0")}
          style={{
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border-subtle)",
            padding: "10px 16px",
            borderRadius: "8px",
            fontWeight: 500,
            fontSize: "0.85rem",
          }}
        >
          Reset (0)
        </button>

        {/* Step Selector */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Step:</span>
          {[1, 5, 10].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              style={{
                background: step === s ? "rgba(56, 189, 248, 0.2)" : "var(--bg-primary)",
                color: step === s ? "var(--accent-cyan)" : "var(--text-secondary)",
                border: `1px solid ${step === s ? "var(--accent-cyan)" : "var(--border-subtle)"}`,
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "0.78rem",
                fontWeight: 600,
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Mutation History Log */}
      {history.length > 0 && (
        <div style={{ marginTop: "4px" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
            Interaction Activity Log (React State)
          </div>
          <div
            style={{
              background: "var(--bg-primary)",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "0.78rem",
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            {history.map((h, i) => (
              <div key={i}>{h}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
