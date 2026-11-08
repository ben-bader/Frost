import { useEffect, useRef, useState } from "react";
import { Globe, TriangleAlert, FileCode, Copy, Check, X } from "lucide-react";
import { Tile } from "./Tile.js";
import { TERMINAL_LINE_COUNT } from "./TerminalTile.js";
import { PLAYGROUND_ERROR, errorToText } from "../../data/playgroundError.js";

const e = PLAYGROUND_ERROR;
const LINE_MS = 130;
// Mirror of TerminalTile's timing so the dialog lands right after the last line.
const SEQUENCE_MS = TERMINAL_LINE_COUNT * LINE_MS + 150;

function FauxDialog({ onDismiss }: { onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const failLine = e.snippetStart + e.failIndex;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="faux-dialog-title"
      className="w-[min(520px,100%)] max-h-full overflow-y-auto error-log-scroll rounded-2xl border border-danger bg-dialog-bg shadow-[0_0_0_1px_var(--color-danger-ring),0_18px_50px_rgb(0_0_0/0.5)] motion-safe:animate-[dialog-in_160ms_ease-out]"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-danger-deep bg-danger-tint px-4 py-2.5">
        <TriangleAlert size={15} className="shrink-0 text-danger" aria-hidden="true" />
        <span id="faux-dialog-title" className="font-mono text-[0.72rem] font-bold uppercase tracking-widest text-danger">
          Errors detected
        </span>
        <span className="rounded-pill border border-danger/50 bg-danger-tint px-2 py-px font-mono text-[0.62rem] font-bold text-danger">
          1 error, 1 warning
        </span>
        <button
          type="button"
          aria-label="Close (decorative)"
          tabIndex={-1}
          className="ml-auto grid h-7 w-7 cursor-default place-items-center text-ink-lo"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-3 p-4">
        {/* Error title */}
        <p className="font-mono text-sm">
          <span className="font-bold text-danger">{e.name}</span>{" "}
          <span className="text-ink-body">{e.message}</span>
        </p>

        {/* Source */}
        <p className="flex items-center gap-1.5 font-mono text-[0.72rem] text-ink-lo">
          <FileCode size={13} aria-hidden="true" />
          {e.file}:{failLine}:{e.column}
        </p>

        {/* Snippet */}
        <div className="overflow-hidden rounded-md border border-white/10 bg-black/30 font-mono text-[0.72rem] leading-6">
          {e.snippet.map((code, i) => {
            const n = e.snippetStart + i;
            const isFail = i === e.failIndex;
            return (
              <div
                key={n}
                className={`flex ${isFail ? "border-l-2 border-danger bg-danger/15" : ""}`}
              >
                <span className="w-8 shrink-0 select-none pr-2 text-right text-ink-dim">{n}</span>
                <span className={`whitespace-pre pr-3 ${isFail ? "text-danger" : "text-ink-body"}`}>
                  {code || " "}
                </span>
              </div>
            );
          })}
        </div>

        {/* Meta grid */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">
          {(
            [
              ["Code", e.code],
              ["Route", e.route],
              ["Runtime", e.runtime],
              ["Time", e.timestamp],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[0.6rem] uppercase tracking-wider text-ink-dim">{k}</dt>
              <dd className="truncate font-mono text-[0.72rem] text-ink-body" title={v}>{v}</dd>
            </div>
          ))}
        </dl>

        {/* Hint */}
        <p className="font-mono text-[0.72rem] leading-5 text-ink-body">
          <span className="text-warn">Suggested fix:</span> {e.hint}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(errorToText(e));
                setCopied(true);
                window.clearTimeout(timer.current);
                timer.current = window.setTimeout(() => setCopied(false), 1500);
              } catch {
                /* clipboard unavailable */
              }
            }}
            className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-mint/60 px-4 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-mint transition-colors duration-150 hover:bg-mint/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
          >
            {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
            {copied ? "Copied" : "Copy details"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-9 items-center rounded-pill border border-danger/60 px-4 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-danger transition-colors duration-150 hover:bg-danger-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export function BrowserTile({ runId }: { runId: number }): React.JSX.Element {
  const [showDialog, setShowDialog] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setShowDialog(false);

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current.push(
      window.setTimeout(() => setShowDialog(true), reduced ? 0 : SEQUENCE_MS)
    );
    return () => timers.current.forEach((t) => window.clearTimeout(t));
  }, [runId]);

  return (
    <Tile
      icon={Globe}
      label="Browser"
      chip={showDialog ? "1 error" : ""}
      chipClass={showDialog ? "border-danger/50 bg-danger-tint text-danger" : "border-line bg-white/5 text-ink-lo"}
    >
      {/* Faux browser window */}
      <div className="relative flex h-full min-h-0 flex-col bg-teal-900/60">
        <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/10 px-3">
          <span className="flex gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warn/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-mint/70" />
          </span>
          <span className="mx-auto rounded-pill border border-white/10 bg-black/30 px-4 py-0.5 font-mono text-[0.65rem] text-ink-lo">
            localhost:3000/playground
          </span>
          <span className="w-10" aria-hidden="true" />
        </div>

        {/* Page area: skeleton bars, dimmed + blurred under overlay */}
        <div className="relative min-h-0 flex-1 overflow-hidden p-4">
          <div className="space-y-3 opacity-60 blur-[1.5px]" aria-hidden="true">
            <div className="h-3 w-2/5 rounded-full bg-white/15" />
            <div className="h-3 w-3/5 rounded-full bg-white/10" />
            <div className="h-24 w-full rounded-2xl border border-white/10 bg-white/5" />
            <div className="h-3 w-1/2 rounded-full bg-white/10" />
            <div className="h-3 w-2/3 rounded-full bg-white/10" />
          </div>
          <div className="absolute inset-0 bg-teal-950/40" aria-hidden="true" />

          {/* Error dialog */}
          {showDialog && (
            <div className="absolute inset-0 grid place-items-center p-4">
              <FauxDialog onDismiss={() => setShowDialog(false)} />
            </div>
          )}
        </div>
      </div>
    </Tile>
  );
}
