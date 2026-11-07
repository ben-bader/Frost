import { useState, useEffect } from "react";

export function ApiClientDemo(): React.JSX.Element {
  const [response, setResponse] = useState<unknown>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [latency, setLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [endpoint, setEndpoint] = useState("/api/health");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchApi = async (url: string, method: string = "GET", body?: unknown) => {
    setLoading(true);
    setErrorMsg(null);
    setEndpoint(url);
    const start = performance.now();

    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });

      const elapsed = Math.round((performance.now() - start) * 10) / 10;
      setLatency(elapsed);
      setStatus(res.status);

      const json = await res.json();
      setResponse(json);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to fetch API");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchApi("/api/health");
  }, []);

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
      <div>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "var(--text-primary)" }}>
          Live API Client
        </h3>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
          Execute real HTTP calls against Frost backend API endpoints.
        </p>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <button
          type="button"
          onClick={() => fetchApi("/api/health")}
          disabled={loading}
          style={{
            background: endpoint === "/api/health" ? "var(--accent-blue)" : "var(--bg-primary)",
            color: "#fff",
            border: "1px solid var(--border-subtle)",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          GET /api/health
        </button>

        <button
          type="button"
          onClick={() => fetchApi("/api/echo", "POST", { user: "Developer", framework: "Frost", timestamp: Date.now() })}
          disabled={loading}
          style={{
            background: endpoint === "/api/echo" ? "var(--accent-blue)" : "var(--bg-primary)",
            color: "#fff",
            border: "1px solid var(--border-subtle)",
            padding: "8px 16px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
          }}
        >
          POST /api/echo
        </button>

        <button
          type="button"
          onClick={() => fetchApi("/api/health", "DELETE")}
          disabled={loading}
          style={{
            background: "transparent",
            color: "var(--accent-rose)",
            border: "1px solid rgba(244, 63, 94, 0.4)",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 500,
          }}
        >
          Test 405 Method Not Allowed
        </button>

        <button
          type="button"
          onClick={() => fetchApi(endpoint)}
          disabled={loading}
          style={{
            marginLeft: "auto",
            background: "var(--bg-hover)",
            color: "var(--accent-cyan)",
            border: "1px solid var(--border-subtle)",
            padding: "8px 14px",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {loading ? "Fetching..." : "↻ Refresh"}
        </button>
      </div>

      {/* Response Status Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "var(--bg-primary)",
          borderRadius: "8px",
          border: "1px solid var(--border-subtle)",
          fontSize: "0.82rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ color: "var(--text-muted)" }}>Target:</span>
          <code style={{ color: "var(--text-primary)", fontWeight: 600 }}>{endpoint}</code>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {status !== null && (
            <span
              style={{
                fontWeight: 700,
                color: status === 200 ? "var(--accent-emerald)" : "var(--accent-rose)",
                background: status === 200 ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
                padding: "2px 8px",
                borderRadius: "4px",
              }}
            >
              HTTP {status}
            </span>
          )}

          {latency !== null && (
            <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
              {latency} ms
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div style={{ background: "rgba(244, 63, 94, 0.1)", border: "1px solid var(--accent-rose)", color: "var(--accent-rose)", padding: "12px", borderRadius: "8px", fontSize: "0.85rem" }}>
          {errorMsg}
        </div>
      )}

      {/* Response Payload Viewer */}
      <div>
        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
          Response Payload (JSON)
        </div>
        <pre
          style={{
            background: "var(--bg-primary)",
            padding: "16px",
            borderRadius: "8px",
            fontSize: "0.82rem",
            color: "var(--text-primary)",
            overflowX: "auto",
            lineHeight: "1.5",
            maxHeight: "340px",
          }}
        >
          {loading ? "// Fetching endpoint..." : JSON.stringify(response, null, 2)}
        </pre>
      </div>
    </div>
  );
}
