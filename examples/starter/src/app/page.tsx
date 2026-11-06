import type { Route } from "@frostjs/core";
import { Counter } from "../components/Counter.js";

export interface HomeLoaderData {
  title: string;
  serverTime: string;
  nodeVersion: string;
  environment: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<HomeLoaderData> {
  return {
    title: "Frost Framework — Minimal Vertical Slice",
    serverTime: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || "development",
  };
}

export const metadata: Route.Metadata = {
  title: "Frost Starter Application",
  description: "A production-ready React full-stack application built with Frost.",
};

export default function HomePage({ data }: Route.ComponentProps<HomeLoaderData>) {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "40px auto", padding: "0 20px" }}>
      <header>
        <h1>{data.title}</h1>
        <p style={{ color: "#666" }}>Predictable, observable, and host-independent React full-stack framework.</p>
      </header>

      <section style={{ background: "#f5f5f5", padding: "16px", borderRadius: "8px", marginTop: "24px" }}>
        <h2>Server-Side Rendered Metrics</h2>
        <ul>
          <li><strong>Server Time:</strong> {data.serverTime}</li>
          <li><strong>Node.js Version:</strong> {data.nodeVersion}</li>
          <li><strong>Environment:</strong> {data.environment}</li>
        </ul>
      </section>

      <section style={{ marginTop: "24px" }}>
        <Counter initialCount={10} />
      </section>

      <footer style={{ marginTop: "40px", borderTop: "1px solid #eee", paddingTop: "16px", color: "#888" }}>
        <p>Backend API available at <a href="/api/health">/api/health</a></p>
      </footer>
    </div>
  );
}
