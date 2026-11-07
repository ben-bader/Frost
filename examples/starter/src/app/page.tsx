import React from "react";
import type { Route } from "@frostjs/core";

export interface OverviewLoaderData {
  title: string;
  serverTime: string;
  nodeVersion: string;
  environment: string;
  uptimeSeconds: number;
  memoryMb: number;
}

export async function loader({ request }: Route.LoaderArgs): Promise<OverviewLoaderData> {
  const mem = process.memoryUsage();
  return {
    title: "Frost Framework — Playground",
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    memoryMb: Math.round(mem.rss / 1024 / 1024),
  };
}

export const metadata: Route.Metadata = {
  title: "Frost Framework — Developer Playground",
  description: "Interactive demonstration of the Frost full-stack React framework.",
};

export default function OverviewPage({ data }: Route.ComponentProps<OverviewLoaderData>): React.JSX.Element {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      {/* Hero Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(2, 132, 199, 0.15) 100%)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "12px",
          padding: "36px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "1.8rem" }}>❄️</span>
          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
            Welcome to Frost
          </h1>
        </div>
        <p style={{ fontSize: "1.05rem", color: "var(--text-secondary)", lineHeight: "1.6", maxWidth: "800px" }}>
          A React-based full-stack web framework built for predictability, visible caching, strict server/client boundaries, and host independence. No proprietary cloud runtimes, no hidden magic.
        </p>
        <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <a
            href="/examples/ssr"
            style={{
              background: "var(--accent-blue)",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 600,
              fontSize: "0.9rem",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            Explore SSR Demo <span>→</span>
          </a>
          <a
            href="/examples/hydration"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              padding: "10px 18px",
              borderRadius: "8px",
              fontWeight: 500,
              fontSize: "0.9rem",
            }}
          >
            Test Hydration
          </a>
        </div>
      </div>

      {/* Live Server Telemetry */}
      <div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "14px", color: "var(--text-primary)" }}>
          Live Server Telemetry (Rendered via Server Loader)
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
          <TelemetryCard label="Server Time" value={data.serverTime.split("T")[1]?.slice(0, 8) || "N/A"} subtext={data.serverTime.split("T")[0] || ""} />
          <TelemetryCard label="Node.js Runtime" value={data.nodeVersion} subtext="LTS Server Engine" />
          <TelemetryCard label="Environment" value={data.environment} subtext="Process Mode" />
          <TelemetryCard label="Process Memory" value={`${data.memoryMb} MB`} subtext={`Uptime: ${data.uptimeSeconds}s`} />
        </div>
      </div>

      {/* Core Architectural Promises */}
      <div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>
          Core Architectural Promises
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
          <PromiseCard
            icon="⚡"
            title="Explicit Execution"
            description="Clear separation between server-only, client-only, and universal modules. No guessing where code executes."
          />
          <PromiseCard
            icon="👁️"
            title="Visible Caching"
            description="Caching is strictly opt-in by default. Every cache entry has an explicit key, TTL, and tag invalidation path."
          />
          <PromiseCard
            icon="⚛️"
            title="React Compatibility"
            description="Standard React DOM SSR and hydrateRoot. Works with ordinary hooks, components, and the React ecosystem."
          />
          <PromiseCard
            icon="🌐"
            title="Host Independence"
            description="Runs anywhere Node.js runs with @frostjs/adapter-node. No proprietary vendor lock-in or cloud silos."
          />
        </div>
      </div>

      {/* Interactive Examples Grid */}
      <div>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "16px", color: "var(--text-primary)" }}>
          Playground Examples
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
          <ExampleCard
            href="/examples/ssr"
            badge="Example A"
            title="Server-Side Rendering (SSR)"
            description="Inspect raw pre-rendered HTML, server headers, and verify data was injected before browser execution."
          />
          <ExampleCard
            href="/examples/hydration"
            badge="Example B"
            title="Client Hydration"
            description="Confirm client hydration status and explore how initial state serializes from server to browser."
          />
          <ExampleCard
            href="/examples/counter"
            badge="Example C"
            title="Interactive React Counter"
            description="Test client-side React state, multi-step increments, and verify event handlers post-hydration."
          />
          <ExampleCard
            href="/examples/api"
            badge="Example D"
            title="REST API Endpoints"
            description="Trigger live API requests to /api/health with loading indicators, latency metrics, and error handling."
          />
          <ExampleCard
            href="/examples/boundaries"
            badge="Example E"
            title="Module Boundary Protection"
            description="Learn how Frost detects and blocks server-only modules (.server.ts) from leaking into client bundles."
          />
        </div>
      </div>
    </div>
  );
}

function TelemetryCard({ label, value, subtext }: { label: string; value: string; subtext: string }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "10px",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>{value}</span>
      <span style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>{subtext}</span>
    </div>
  );
}

function PromiseCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "1.3rem" }}>{icon}</span>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
      </div>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{description}</p>
    </div>
  );
}

function ExampleCard({ href, badge, title, description }: { href: string; badge: string; title: string; description: string }) {
  return (
    <a
      href={href}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "10px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", background: "rgba(56, 189, 248, 0.15)", color: "var(--accent-cyan)", padding: "2px 8px", borderRadius: "4px", fontWeight: 600 }}>
          {badge}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>→</span>
      </div>
      <h3 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--text-primary)" }}>{title}</h3>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: "1.5" }}>{description}</p>
    </a>
  );
}
