import { useEffect, useRef, useState } from "react";
import { Terminal } from "lucide-react";
import { Tile } from "./Tile.js";
import { PLAYGROUND_ERROR } from "../../data/playgroundError.js";

const LINE_MS = 130;

type Line =
  | { kind: "cmd"; text: string }
  | { kind: "ok"; pre?: string; url?: string; text?: string }
  | { kind: "blank" }
  | { kind: "badge-err"; text: string; detail: string }
  | { kind: "badge-warn"; text: string }
  | { kind: "code"; text: string }
  | { kind: "at"; text: string }
  | { kind: "snippet"; fail?: boolean; num?: number; text?: string; caret?: boolean }
  | { kind: "prompt" };

// Terminal output is derived from the same error object as the dialog.
function buildLines(): Line[] {
  const e = PLAYGROUND_ERROR;
  const w = e.warning;
  const lines: Line[] = [
    { kind: "cmd", text: "$ frost dev" },
    { kind: "ok", pre: "ready on ", url: "http://localhost:3000" },
    { kind: "ok", text: "compiled /playground in 84ms" },
    { kind: "blank" },
    { kind: "badge-err", text: "ERROR", detail: `${e.name}: ${e.message}` },
    { kind: "code", text: `code  ${e.code}` },
    { kind: "at", text: `at    ${e.file}:${e.line}:${e.column}` },
    { kind: "blank" },
  ];
  e.snippet.forEach((text, i) => {
    const n = e.snippetStart + i;
    if (i === e.failIndex) {
      lines.push({ kind: "snippet", fail: true, num: n, text });
      lines.push({ kind: "snippet", caret: true });
    } else {
      lines.push({ kind: "snippet", num: n, text });
    }
  });
  lines.push(
    { kind: "blank" },
    { kind: "badge-warn", text: "WARN" },
    { kind: "at", text: w.message },
    { kind: "at", text: `at    ${w.file}:${w.line}:${w.column}` },
    { kind: "blank" },
    { kind: "prompt" }
  );
  return lines;
}

const LINES = buildLines();
export const TERMINAL_LINE_COUNT = LINES.length;
const ERROR_LINE_INDEX = LINES.findIndex((l) => l.kind === "badge-err");

function LineView({ line }: { line: Line }) {
  switch (line.kind) {
    case "cmd":
      return <div className="text-ink-body">{line.text}</div>;
    case "ok":
      return (
        <div className="text-mint">
          <span className="mr-1">✓</span>
          {line.pre}
          {line.url && <span className="underline decoration-mint/50 underline-offset-2">{line.url}</span>}
          {line.text}
        </div>
      );
    case "blank":
      return <div>&nbsp;</div>;
    case "badge-err":
      return (
        <div>
          <span className="mr-2 inline-block rounded-sm bg-danger px-1.5 py-px align-middle font-mono text-[0.85em] font-bold text-[#1a0508]">
            {line.text}
          </span>
          <span className="text-ink-body">{line.detail}</span>
        </div>
      );
    case "badge-warn":
      return (
        <div>
          <span className="mr-2 inline-block rounded-sm bg-warn px-1.5 py-px align-middle font-mono text-[0.85em] font-bold text-[#241503]">
            {line.text}
          </span>
        </div>
      );
    case "code":
      return <div className="text-ink-body">{line.text}</div>;
    case "at":
      return <div className="text-ink-dim">{line.text}</div>;
    case "snippet":
      if (line.caret) {
        return (
          <div className="whitespace-pre text-danger">
            {"      |   "}
            <span className="text-danger">^</span>
          </div>
        );
      }
      return (
        <div className={`whitespace-pre ${line.fail ? "bg-danger/15 text-danger" : "text-ink-body"}`}>
          {line.fail ? ">" : " "} {line.num} | {line.text}
        </div>
      );
    case "prompt":
      return (
        <div className="text-ink-body">
          $ <span className="ml-1 inline-block h-[1em] w-[0.6em] translate-y-[0.15em] bg-mint motion-safe:animate-pulse" aria-hidden="true" />
        </div>
      );
  }
}

export function TerminalTile({ runId }: { runId: number }): React.JSX.Element {
  const [printed, setPrinted] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setPrinted(0);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPrinted(LINES.length);
      return;
    }

    LINES.forEach((_, i) => {
      timers.current.push(
        window.setTimeout(() => setPrinted(i + 1), (i + 1) * LINE_MS)
      );
    });
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, [runId]);

  const errorPrinted = printed > ERROR_LINE_INDEX;

  return (
    <Tile
      icon={Terminal}
      label="Terminal"
      chip={errorPrinted ? "error" : "running"}
      chipClass={errorPrinted ? "border-danger/50 bg-danger-tint text-danger" : "border-mint/40 bg-mint/10 text-mint"}
    >
      <div className="h-full overflow-hidden bg-[#0a1210] px-4 py-3 font-mono text-ink-body [font-size:clamp(10px,1.55vh,13px)] leading-[1.7]">
        {LINES.slice(0, printed).map((line, i) => (
          <LineView key={i} line={line} />
        ))}
        {printed < LINES.length && (
          <div className="text-ink-body">
            $ <span className="ml-1 inline-block h-[1em] w-[0.6em] translate-y-[0.15em] bg-mint motion-safe:animate-pulse" aria-hidden="true" />
          </div>
        )}
      </div>
    </Tile>
  );
}
