import { useState, useEffect, useRef } from "react";

interface ApiResult {
  method: string;
  endpoint: string;
  status: number | null;
  latencyMs: number | null;
  body: unknown;
  error?: string;
}

const endpoints = [
  { label: "GET /api/health", method: "GET", url: "/api/health" },
  { label: "POST /api/echo", method: "POST", url: "/api/echo", body: { user: "developer", framework: "frost" } },
  { label: "GET /api/records", method: "GET", url: "/api/records" },
  { label: "DELETE /api/health", method: "DELETE", url: "/api/health" },
] as const;

export function ApiClientDemo(): React.JSX.Element {
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const didInit = useRef(false);

  const call = async (method: string, url: string, body?: unknown, label?: string) => {
    setLoading(label ?? `${method} ${url}`);
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const latencyMs = Math.round((performance.now() - start) * 10) / 10;
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = JSON.parse(text);
      } catch {
        // keep raw text
      }
      setResult({ method, endpoint: url, status: res.status, latencyMs, body: parsed });
    } catch (err) {
      setResult({
        method,
        endpoint: url,
        status: null,
        latencyMs: Math.round((performance.now() - start) * 10) / 10,
        body: null,
        error: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setLoading(null);
    }
  };

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void call("GET", "/api/health");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="surface">
      <div className="surface__head">
        <div>
          <h3 className="h3">API client</h3>
          <p className="body" style={{ fontSize: "0.8rem", marginTop: 2 }}>
            Real requests against the Frost API runtime.
          </p>
        </div>
        {result?.status !== null && result?.status !== undefined && (
          <span className={`pill ${result.status < 400 ? "pill--success" : "pill--danger"}`}>{result.status}</span>
        )}
      </div>

      <div className="btn-row" style={{ marginBottom: "var(--space-4)" }}>
        {endpoints.map((ep) => (
          <button
            key={ep.label}
            type="button"
            className={`btn${loading === ep.label ? " btn--primary" : ""}`}
            style={{ height: 32, fontSize: "0.74rem", fontFamily: "var(--font-mono)" }}
            disabled={loading !== null}
            onClick={() => call(ep.method, ep.url, "body" in ep ? ep.body : undefined, ep.label)}
          >
            {loading === ep.label ? "…" : ep.label}
          </button>
        ))}
      </div>

      {result && (
        <>
          <div className="kv" style={{ marginBottom: "var(--space-4)" }}>
            <div className="kv__row">
              <span className="kv__key">Request</span>
              <span className="kv__value kv__value--mono">{result.method} {result.endpoint}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Status</span>
              <span className="kv__value kv__value--mono">{result.status ?? "network error"}</span>
            </div>
            <div className="kv__row">
              <span className="kv__key">Duration</span>
              <span className="kv__value kv__value--mono">{result.latencyMs != null ? `${result.latencyMs} ms` : "—"}</span>
            </div>
            {result.method === "POST" && (
              <div className="kv__row">
                <span className="kv__key">Body</span>
                <span className="kv__value kv__value--mono">{JSON.stringify({ user: "developer", framework: "frost" })}</span>
              </div>
            )}
          </div>
          {result.error && (
            <div className="pill pill--danger" style={{ marginBottom: "var(--space-3)", display: "flex", width: "fit-content" }}>{result.error}</div>
          )}
          <pre className="code-block code-block--wrap" style={{ maxHeight: 280 }}>{JSON.stringify(result.body, null, 2)}</pre>
        </>
      )}
    </div>
  );
}
