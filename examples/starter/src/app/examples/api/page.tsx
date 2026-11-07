import React from "react";
import type { Route } from "@frostjs/core";
import { ApiClientDemo } from "../../../components/ApiClientDemo.js";

export const metadata: Route.Metadata = {
  title: "API Routes — Frost Playground",
};

export default function ApiExamplesPage(): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
            Example D
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Backend Endpoints</span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          REST API Routes Demonstration
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "0.95rem" }}>
          Frost maps files in <code>src/api/</code> to web-standard HTTP endpoints supporting <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code>, and automatic 405 Method Not Allowed handling.
        </p>
      </div>

      <ApiClientDemo />

      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
          API Route Implementation
        </h3>
        <pre
          style={{
            background: "var(--bg-primary)",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "0.82rem",
            color: "var(--text-primary)",
            overflowX: "auto",
            lineHeight: "1.5",
          }}
        >
{`// src/api/health.ts
import { json } from "@frostjs/server";
import type { FrostRequestContext } from "@frostjs/core";

export function GET(request: Request, context: FrostRequestContext): Response {
  return json({
    status: "healthy",
    uptimeSeconds: Math.floor(process.uptime()),
    requestId: context.requestId,
  });
}`}
        </pre>
      </div>
    </div>
  );
}
