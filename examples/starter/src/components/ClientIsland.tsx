import { useState, useEffect } from "react";

// Hydrated island: shows "server-rendered" until React takes over, then
// enables a browser-only counter. Inert (and disabled) without JS.
export function ClientIsland(): React.JSX.Element {
  const [hydrated, setHydrated] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <div>
      <div className="client-status">
        <span className={`client-status__dot${hydrated ? " client-status__dot--live" : ""}`} aria-hidden="true" />
        <span className="client-status__label">state</span>
        <span className="client-status__value">{hydrated ? "hydrated" : "server-rendered"}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", paddingTop: "var(--space-5)" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "1.75rem", color: "var(--text-hi)", fontVariantNumeric: "tabular-nums" }}>
          {count}
        </span>
        <button
          type="button"
          className="btn btn--secondary"
          disabled={!hydrated}
          onClick={() => setCount((c) => c + 1)}
        >
          Increment
        </button>
      </div>
      <p className="client-note">
        This count is browser-only state. It stays at 0 and inert until the client takes over.
      </p>
    </div>
  );
}
