import React from "react";
import type { Route } from "@frostjs/core";

export interface SsrLoaderData {
  message: string;
  serverTimestamp: string;
  renderDurationMs: number;
  environment: string;
  nodeVersion: string;
  platform: string;
  memoryUsage: {
    rssMb: number;
    heapUsedMb: number;
  };
  requestInfo: {
    method: string;
    url: string;
    host: string;
    userAgent: string;
  };
}

export async function loader({ request, url }: Route.LoaderArgs): Promise<SsrLoaderData> {
  const start = performance.now();
  const mem = process.memoryUsage();

  return {
    message: "This payload was computed on the Node.js server before HTML delivery.",
    serverTimestamp: new Date().toISOString(),
    renderDurationMs: Math.round((performance.now() - start) * 100) / 100,
    environment: process.env.NODE_ENV || "development",
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    requestInfo: {
      method: request.method,
      url: url.pathname,
      host: request.headers.get("host") || "localhost:3000",
      userAgent: request.headers.get("user-agent") || "Browser Client",
    },
  };
}

export const metadata: Route.Metadata = {
  title: "Server-Side Rendering (SSR) — Frost Playground",
};

export default function SsrPage({ data }: Route.ComponentProps<SsrLoaderData>): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8rem", background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
            Example A
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Core Rendering Pipeline</span>
        </div>
        <h1 style={{ fontSize: "1.85rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Server-Side Rendering (SSR) Demonstration
        </h1>
        <p style={{ color: "var(--text-secondary)", marginTop: "6px", fontSize: "0.95rem" }}>
          This page proves real server-side execution. The data below was retrieved inside a Frost server <code>loader</code>, pre-rendered into HTML via React DOM, and served to your browser with full document metadata.
        </p>
      </div>

      {/* Verification Card */}
      <div
        style={{
          background: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          borderRadius: "10px",
          padding: "20px",
          display: "flex",
          alignItems: "flex-start",
          gap: "14px",
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>✅</span>
        <div>
          <h3 style={{ fontSize: "0.98rem", fontWeight: 600, color: "var(--accent-emerald)", marginBottom: "4px" }}>
            SSR Verification Check
          </h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>
            Right-click and select <strong>&quot;View Page Source&quot;</strong> in your browser: you will see all the telemetry, server timestamps, and HTML content directly inside the received document before any client JavaScript executed.
          </p>
        </div>
      </div>

      {/* Live Server Payload Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
            Server Execution Context
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Server Timestamp:</span>
              <strong style={{ color: "var(--accent-cyan)", fontFamily: "var(--font-mono)" }}>{data.serverTimestamp}</strong>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Node.js Version:</span>
              <span>{data.nodeVersion} ({data.platform})</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Environment:</span>
              <span style={{ textTransform: "uppercase", fontSize: "0.75rem", background: "rgba(56, 189, 248, 0.15)", padding: "2px 6px", borderRadius: "4px" }}>
                {data.environment}
              </span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>RSS Memory:</span>
              <span>{data.memoryUsage.rssMb} MB</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Heap Used:</span>
              <span>{data.memoryUsage.heapUsedMb} MB</span>
            </li>
          </ul>
        </div>

        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
            HTTP Request Details
          </h3>
          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>HTTP Method:</span>
              <span style={{ fontWeight: 600, color: "var(--accent-emerald)" }}>{data.requestInfo.method}</span>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Path:</span>
              <code style={{ color: "var(--text-primary)" }}>{data.requestInfo.url}</code>
            </li>
            <li style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Host Header:</span>
              <code>{data.requestInfo.host}</code>
            </li>
            <li style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
              <span style={{ color: "var(--text-muted)" }}>User-Agent:</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", wordBreak: "break-all", background: "var(--bg-secondary)", padding: "6px", borderRadius: "4px" }}>
                {data.requestInfo.userAgent}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Code Snippet */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: "10px", padding: "20px" }}>
        <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>
          Frost Route Code Contract
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
{`// src/app/examples/ssr/page.tsx
import type { Route } from "@frostjs/core";

export async function loader({ request, url }: Route.LoaderArgs) {
  return {
    serverTimestamp: new Date().toISOString(),
    nodeVersion: process.version,
    method: request.method,
  };
}

export default function SsrPage({ data }: Route.ComponentProps) {
  return <h1>Timestamp: {data.serverTimestamp}</h1>;
}`}
        </pre>
      </div>
    </div>
  );
}
