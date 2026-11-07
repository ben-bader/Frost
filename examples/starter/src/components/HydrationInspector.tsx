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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Hydration Status Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: isHydrated ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
          border: `1px solid ${isHydrated ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"}`,
          borderRadius: "10px",
          padding: "16px 20px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              width: "12px",
              height: "12px",
              borderRadius: "50%",
              background: isHydrated ? "var(--accent-emerald)" : "var(--accent-amber)",
              boxShadow: isHydrated ? "0 0 8px var(--accent-emerald)" : "none",
            }}
          />
          <div>
            <div style={{ fontWeight: 600, color: isHydrated ? "var(--accent-emerald)" : "var(--accent-amber)" }}>
              {isHydrated ? "Client Hydration Complete" : "SSR Initializing..."}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
              {isHydrated
                ? `React 19 hydrateRoot executed successfully at ${hydrationTime}.`
                : "Awaiting client script execution."}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: "0.75rem",
            background: isHydrated ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
            color: isHydrated ? "var(--accent-emerald)" : "var(--accent-amber)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontWeight: 700,
          }}
        >
          {isHydrated ? "HYDRATED" : "PENDING"}
        </span>
      </div>

      {/* Hydration Payload Inspector */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>
            Serialized Hydration State (__FROST_DATA__)
          </h3>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            Read from <code>&lt;script id=&quot;__FROST_DATA__&quot;&gt;</code>
          </span>
        </div>
        <pre
          style={{
            background: "var(--bg-primary)",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "0.82rem",
            color: "var(--accent-cyan)",
            overflowX: "auto",
            lineHeight: "1.5",
          }}
        >
          {JSON.stringify(ctx, null, 2)}
        </pre>
      </div>
    </div>
  );
}
