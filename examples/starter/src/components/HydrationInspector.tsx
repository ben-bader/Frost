import { useState, useEffect } from "react";
import { useFrostContext } from "@frostjs/react";

export function HydrationInspector(): React.JSX.Element {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrationTime, setHydrationTime] = useState<string>("");
  const ctx = useFrostContext();

  useEffect(() => {
    setIsHydrated(true);
    setHydrationTime(new Date().toLocaleTimeString());
  }, []);

  const serialized = JSON.stringify(
    { pathname: ctx.pathname, params: ctx.params, loaderData: ctx.loaderData },
    null,
    2
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
      <div className="surface surface--interactive" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isHydrated ? "var(--status-success)" : "var(--status-warning)",
              boxShadow: isHydrated ? "0 0 10px rgba(94,232,200,0.8)" : "none",
              flex: "none",
            }}
          />
          <div>
            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: isHydrated ? "var(--status-success)" : "var(--status-warning)" }}>
              {isHydrated ? "Hydration complete" : "Hydration pending"}
            </div>
            <div className="body" style={{ fontSize: "0.78rem" }}>
              {isHydrated ? `React hydrateRoot finished at ${hydrationTime}.` : "Waiting for the client entry module."}
            </div>
          </div>
        </div>
        <span className={`pill ${isHydrated ? "pill--success" : "pill--warning"}`}>
          {isHydrated ? "hydrated" : "pending"}
        </span>
      </div>

      <div className="surface">
        <div className="surface__head">
          <h3 className="h3">Serialized route state</h3>
          <span className="meta">__FROST_DATA__</span>
        </div>
        <pre className="code-block code-block--wrap" style={{ maxHeight: 260 }}>{serialized}</pre>
      </div>
    </div>
  );
}
