import React from "react";

export function Header(): React.JSX.Element {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 24px",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-subtle)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <img
            src="/favicon.png"
            onError={(e) => {
              // Fallback to favicon.ico if favicon.png not yet placed
              const target = e.currentTarget;
              if (target.src.endsWith(".png")) {
                target.src = "/favicon.ico";
              }
            }}
            alt="Frost Logo"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              objectFit: "contain",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700, fontSize: "1.15rem", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
              Frost
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--accent-cyan)", fontWeight: 500 }}>
              Full-Stack React Framework
            </span>
          </div>
        </a>
        <span
          style={{
            fontSize: "0.75rem",
            background: "rgba(56, 189, 248, 0.12)",
            color: "var(--accent-cyan)",
            padding: "2px 8px",
            borderRadius: "999px",
            border: "1px solid rgba(56, 189, 248, 0.25)",
            fontWeight: 500,
            marginLeft: "6px",
          }}
        >
          v0.1.0
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            padding: "4px 10px",
            borderRadius: "6px",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "var(--accent-emerald)",
              boxShadow: "0 0 6px var(--accent-emerald)",
            }}
          />
          <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>SSR Runtime: Active</span>
        </div>

        <a
          href="/api/health"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            padding: "6px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            background: "var(--bg-card)",
            transition: "all 0.15s ease",
          }}
        >
          API Status
        </a>

        <a
          href="https://github.com/frostjs/frost"
          target="_blank"
          rel="noreferrer"
          style={{
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            padding: "6px 14px",
            borderRadius: "6px",
            background: "var(--accent-blue)",
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
