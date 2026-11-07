import { Component, useEffect, useRef, useState, type ReactNode, type ErrorInfo } from "react";
import { useFrostContext } from "./context.js";

export interface FrostErrorBoundaryProps {
  children?: ReactNode;
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface FrostErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

interface ParsedFrame {
  file: string;
  line?: number;
  column?: number;
  raw: string;
}

function isProductionEnv(): boolean {
  if (typeof process !== "undefined" && process.env?.NODE_ENV === "production") {
    return true;
  }
  try {
    // Vite replaces import.meta.env.PROD at build time for browser bundles.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (import.meta as any)?.env;
    if (env?.PROD === true) return true;
  } catch {
    // import.meta unavailable in some runtimes
  }
  return false;
}

/** Extracts the most useful source location from a JS stack trace. */
function parseFirstSourceFrame(stack: string | undefined): ParsedFrame | null {
  if (!stack) return null;
  const lines = stack.split("\n").slice(1);
  const frameRe = /\(?((?:[A-Za-z]:)?[^()\s]+\.(?:tsx?|jsx?|mjs|cjs|vue|svelte)):(\d+):(\d+)\)?/;
  // Prefer frames that look like application source over bundler internals.
  const scored: Array<ParsedFrame & { score: number }> = [];
  for (const line of lines) {
    const m = line.match(frameRe);
    if (!m || m[1] === undefined || m[2] === undefined || m[3] === undefined) continue;
    const file = m[1];
    const score = /node_modules|vite|react-dom|scheduler/i.test(file) ? 0 : 1;
    scored.push({ file, line: Number(m[2]), column: Number(m[3]), raw: line.trim(), score });
  }
  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best) return null;
  return { file: best.file, line: best.line, column: best.column, raw: best.raw };
}

function firstComponentName(componentStack: string | null): string | null {
  if (!componentStack) return null;
  const match = componentStack.match(/at\s+([A-Z][A-Za-z0-9_]*)/);
  return match?.[1] ?? null;
}

function buildDiagnosticReport(error: Error, componentStack: string | null, route: string | null): string {
  const frame = parseFirstSourceFrame(error.stack);
  const component = firstComponentName(componentStack);
  return [
    "Frost error report",
    `Type: ${error.name}`,
    `Message: ${error.message}`,
    component ? `Component: ${component}` : null,
    frame ? `Source: ${frame.file}:${frame.line}:${frame.column}` : "Source: unavailable",
    route ? `Route: ${route}` : null,
    "",
    error.stack ?? "(no stack trace)",
    componentStack ? `\nComponent stack:\n${componentStack}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface FrostErrorFallbackProps {
  error: Error;
  componentStack?: string | null;
  route?: string | null;
  onReset: () => void;
}

/**
 * Developer-facing diagnostic dialog rendered by FrostErrorBoundary.
 * In production builds it degrades to a safe message without internals.
 */
export function FrostErrorFallback({ error, componentStack, route, onReset }: FrostErrorFallbackProps): React.JSX.Element {
  const ctx = useFrostContext();
  const resolvedRoute = route ?? ctx?.pathname ?? null;
  const production = isProductionEnv();

  const [stackOpen, setStackOpen] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const frame = production ? null : parseFirstSourceFrame(error.stack);
  const component = production ? null : firstComponentName(componentStack ?? null);

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onReset();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onReset]);

  const flashCopied = (key: string) => {
    setCopied(key);
    window.setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
  };

  const report = production
    ? `Frost runtime error\nType: ${error.name}\nMessage: ${error.message}`
    : buildDiagnosticReport(error, componentStack ?? null, resolvedRoute);

  const btn = (extra?: React.CSSProperties): React.CSSProperties => ({
    fontFamily: "var(--font-mono, ui-monospace, monospace)",
    fontSize: "0.75rem",
    fontWeight: 500,
    padding: "6px 12px",
    borderRadius: "var(--radius-menu, 12px)",
    border: "1px solid var(--line, #2c4d4b)",
    background: "transparent",
    color: "var(--text-hi, #f2f7f5)",
    cursor: "pointer",
    transition: "background 150ms ease-out, color 150ms ease-out",
    ...extra,
  });

  const metaRow = (label: string, value: ReactNode) => (
    <div style={{ display: "flex", gap: "12px", padding: "5px 0", borderBottom: "1px solid var(--line, #2c4d4b)" }}>
      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-lo, #8faba6)", width: 76, flex: "none", paddingTop: 2 }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem", color: "var(--text-hi, #f2f7f5)", wordBreak: "break-word" }}>{value ?? "—"}</span>
    </div>
  );

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Frost runtime error"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "grid",
        placeItems: "center",
        padding: "20px",
        background: "rgba(1 10 9 / 0.6)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onReset();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          width: "min(680px, 100%)",
          maxHeight: "min(78vh, 720px)",
          overflowY: "auto",
          background: "var(--surface, #0a1a1c)",
          border: "1px solid var(--accent, #0af3c5)",
          borderRadius: "var(--radius-menu, 12px)",
          outline: "none",
        }}
      >
        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid var(--line, #2c4d4b)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent, #0af3c5)", fontWeight: 600 }}>
              Frost runtime error
            </span>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", color: "var(--text-lo, #8faba6)" }}>{production ? "production" : "development"}</span>
          </div>
          <div style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--text-hi, #f2f7f5)", letterSpacing: "-0.01em" }}>
            {error.name}: {error.message}
          </div>
        </div>

        <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Meta grid */}
          {!production && (
            <div>
              {metaRow("Type", error.name)}
              {component && metaRow("Component", component)}
              {frame && metaRow("Source", `${frame.file}:${frame.line}:${frame.column}`)}
              {resolvedRoute && metaRow("Route", resolvedRoute)}
              {metaRow("Phase", "React render / hydration")}
            </div>
          )}
          {production && resolvedRoute && metaRow("Route", resolvedRoute)}

          {/* Message */}
          <div>
            <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-lo, #8faba6)", marginBottom: 6 }}>Message</div>
            <div style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-body, #bccfcb)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{error.message}</div>
          </div>

          {/* Expandable stacks */}
          {!production && error.stack && (
            <div>
              <button type="button" onClick={() => setStackOpen((v) => !v)} style={{ ...btn(), marginBottom: 8 }}>
                {stackOpen ? "Hide stack trace" : "Show stack trace"}
              </button>
              {stackOpen && (
                <pre style={{ background: "var(--teal-900, #10282a)", border: "1px solid var(--line, #2c4d4b)", borderRadius: "var(--radius-menu, 12px)", padding: "12px 14px", fontSize: "0.75rem", lineHeight: 1.6, color: "var(--text-body, #bccfcb)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220 }}>
                  {error.stack}
                </pre>
              )}
            </div>
          )}

          {!production && componentStack && (
            <div>
              <button type="button" onClick={() => setComponentsOpen((v) => !v)} style={{ ...btn(), marginBottom: 8 }}>
                {componentsOpen ? "Hide component stack" : "Show component stack"}
              </button>
              {componentsOpen && (
                <pre style={{ background: "var(--teal-900, #10282a)", border: "1px solid var(--line, #2c4d4b)", borderRadius: "var(--radius-menu, 12px)", padding: "12px 14px", fontSize: "0.75rem", lineHeight: 1.6, color: "var(--text-body, #bccfcb)", overflowX: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 220 }}>
                  {componentStack}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={async () => { if (await copyText(error.message)) flashCopied("msg"); }} style={btn()}>
              {copied === "msg" ? "Copied" : "Copy message"}
            </button>
            <button type="button" onClick={async () => { if (await copyText(report)) flashCopied("report"); }} style={btn()}>
              {copied === "report" ? "Copied" : "Copy report"}
            </button>
            <button
              type="button"
              onClick={onReset}
              style={btn({ background: "var(--accent, #0af3c5)", borderColor: "transparent", color: "var(--teal-950, #0a1a1c)" })}
            >
              Dismiss
            </button>
          </div>
          <div style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.68rem", color: "var(--text-lo, #8faba6)" }}>
            Esc or backdrop click to dismiss. Error boundaries catch render errors — not event-handler or async errors.
          </div>
        </div>
      </div>
    </div>
  );
}

export class FrostErrorBoundary extends Component<FrostErrorBoundaryProps, FrostErrorBoundaryState> {
  override state: FrostErrorBoundaryState = {
    hasError: false,
    error: null,
    componentStack: null,
  };

  static getDerivedStateFromError(error: Error): Partial<FrostErrorBoundaryState> {
    return {
      hasError: true,
      error,
      componentStack: null,
    };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ componentStack: info.componentStack ?? null });
    console.error("[Frost Error Boundary Caught]:", error, info);
    this.props.onError?.(error, info);
  }

  resetError = (): void => {
    this.setState({ hasError: false, error: null, componentStack: null });
  };

  override render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return this.props.fallback(this.state.error, this.resetError);
      }
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <FrostErrorFallback
          error={this.state.error}
          componentStack={this.state.componentStack}
          onReset={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}
