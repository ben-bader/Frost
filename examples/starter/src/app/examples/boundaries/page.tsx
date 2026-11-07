import React from "react";
import type { Route } from "@frostjs/core";

export interface BoundaryRecord {
  id: string;
  name: string;
  role: string;
  isPrivileged: boolean;
}

export async function loader({ url }: Route.LoaderArgs): Promise<{ records: BoundaryRecord[] }> {
  // Query through the server API endpoint that bridges to database.server.ts
  const apiUrl = new URL("/api/records", url.origin || "http://localhost:3000");
  try {
    const res = await fetch(apiUrl.href);
    if (res.ok) {
      const data = await res.json();
      return { records: data.records || [] };
    }
  } catch (err) {
    console.warn("[Frost Boundaries Demo] Falling back to default records:", err);
  }

  return {
    records: [
      { id: "usr_1", name: "Alice Administrator", role: "admin", isPrivileged: true },
      { id: "usr_2", name: "Bob Developer", role: "engineer", isPrivileged: false },
      { id: "usr_3", name: "Charlie Designer", role: "designer", isPrivileged: false },
    ],
  };
}

export const metadata: Route.Metadata = {
  title: "Server/Client Boundaries — Frost Playground",
};

export default function BoundariesPage({ data }: Route.ComponentProps<{ records: BoundaryRecord[] }>): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
            Example E
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Security & Isolation</span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Server / Client Module Boundaries
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "0.95rem" }}>
          One of Frost&apos;s primary differentiators is compile-time enforcement of server/client isolation. Database connections, cryptographic keys, and private credentials never leak into browser bundles.
        </p>
      </div>

      {/* Database Query Result (Safe Execution) */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
          Data Queried via <code>src/server/database.server.ts</code>
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: "14px" }}>
          The backend API accessed the mock database rows from <code>database.server.ts</code>, stripped secret hashes, and delivered only public fields to the client.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {data.records.map((r) => (
            <div
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--bg-primary)",
                borderRadius: "6px",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <strong>{r.name}</strong>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{r.id}</span>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: r.isPrivileged ? "rgba(244, 63, 94, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  color: r.isPrivileged ? "var(--accent-rose)" : "var(--accent-emerald)",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontWeight: 600,
                }}
              >
                {r.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Compiler Diagnostic Card */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
          Compiler Diagnostic FS1004
        </h3>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: "12px", lineHeight: "1.5" }}>
          If a developer attempts to import <code>database.server.ts</code> directly inside a browser component, the Frost build plugin immediately halts compilation and prints the complete importer chain:
        </p>
        <pre
          style={{
            background: "var(--bg-primary)",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "0.82rem",
            color: "var(--accent-rose)",
            overflowX: "auto",
            lineHeight: "1.5",
          }}
        >
{`FS1004: Server-only module imported into client bundle.
  Importer: src/components/UserProfile.client.tsx
  Target:   src/server/database.server.ts

  Hint: Move the privileged operation into a server loader or API action,
  and pass only public data to the client component.
  Documentation: https://frostjs.dev/docs/errors/FS1004`}
        </pre>
      </div>
    </div>
  );
}
