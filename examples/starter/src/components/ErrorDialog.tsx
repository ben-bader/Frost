import { useEffect, useRef, useState } from "react";
import {
  CircleX,
  TriangleAlert,
  Info,
  FileCode,
  X,
  Copy,
  Check,
  ChevronDown,
} from "lucide-react";
import { Button } from "./Button.js";
import {
  PLAYGROUND_ERRORS,
  errorCounts,
  type PlaygroundError,
  type ErrorSeverity,
} from "../data/errors.js";

const SEVERITY_META: Record<
  ErrorSeverity,
  { icon: typeof CircleX; label: string; text: string; chip: string }
> = {
  error: {
    icon: CircleX,
    label: "Error",
    text: "text-danger",
    chip: "border-danger/50 bg-danger-tint text-danger",
  },
  warning: {
    icon: TriangleAlert,
    label: "Warning",
    text: "text-warn",
    chip: "border-warn/50 bg-warn/10 text-warn",
  },
  info: {
    icon: Info,
    label: "Info",
    text: "text-mint",
    chip: "border-mint/50 bg-mint/10 text-mint",
  },
};

function errorToText(e: PlaygroundError): string {
  return [
    `${SEVERITY_META[e.severity].label.toUpperCase()} ${e.name}: ${e.message}`,
    `  at ${e.file}:${e.snippetStart + e.failIndex - 1}:${e.column}`,
    ...e.stack.map((s) => `  ${s}`),
    `  code=${e.meta.code} request=${e.meta.requestId} route=${e.meta.route} runtime=${e.meta.runtime}`,
    `  hint: ${e.hint}`,
  ].join("\n");
}

function allErrorsText(errors: PlaygroundError[]): string {
  return errors.map(errorToText).join("\n\n---\n\n");
}

function CopyButton({ getText, label }: { getText: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <Button
      variant="icon"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(getText());
          setCopied(true);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {copied ? (
        <Check size={15} className="text-mint" aria-hidden="true" />
      ) : (
        <Copy size={15} aria-hidden="true" />
      )}
    </Button>
  );
}

function Snippet({ error }: { error: PlaygroundError }) {
  const failLineNo = error.snippetStart + error.failIndex - 1;
  return (
    <div className="overflow-hidden rounded-md border border-line bg-teal-950 font-mono text-[0.78rem] leading-6">
      <div className="max-h-44 overflow-auto error-log-scroll">
        {error.snippet.map((code, i) => {
          const lineNo = error.snippetStart + i;
          const isFail = i === error.failIndex - 1;
          return (
            <div
              key={lineNo}
              className={`flex ${isFail ? "bg-danger-tint text-danger" : "text-ink-body"}`}
            >
              <span className="w-10 shrink-0 select-none pr-3 text-right text-ink-lo/60">
                {lineNo}
              </span>
              <span className="whitespace-pre pr-4">{code || " "}</span>
            </div>
          );
        })}
      </div>
      {/* Caret under the failing column (mono font → ch units track columns) */}
      <div className="border-t border-line/60 px-2 pb-1 pt-0.5 text-danger">
        <span
          className="inline-block"
          style={{ paddingLeft: `calc(2.5rem + ${error.column - 1}ch)` }}
          aria-hidden="true"
        >
          ▲
        </span>
      </div>
      <span className="sr-only">
        Failing line {failLineNo}, column {error.column}
      </span>
    </div>
  );
}

function ErrorCard({ error, defaultOpen }: { error: PlaygroundError; defaultOpen: boolean }) {
  const meta = SEVERITY_META[error.severity];
  const Icon = meta.icon;
  const failLineNo = error.snippetStart + error.failIndex - 1;

  return (
    <details
      open={defaultOpen}
      className="group rounded-md border border-line bg-teal-900/60 open:border-teal-700"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <Icon size={16} className={meta.text} aria-hidden="true" />
        <span className={`font-mono text-[0.7rem] font-bold uppercase tracking-wider ${meta.text}`}>
          {meta.label}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-hi">
          {error.name}: {error.message}
        </span>
        <ChevronDown
          size={14}
          className="shrink-0 text-ink-lo transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="space-y-4 border-t border-line px-4 py-4">
        {/* Source */}
        <div className="flex items-center gap-2 font-mono text-xs text-ink-body">
          <FileCode size={14} className="text-ink-lo" aria-hidden="true" />
          <span>
            {error.file}:{failLineNo}:{error.column}
          </span>
        </div>

        <Snippet error={error} />

        {/* Stack trace */}
        <details className="group/stack">
          <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[0.7rem] uppercase tracking-wider text-ink-lo [&::-webkit-details-marker]:hidden">
            <ChevronDown
              size={12}
              className="transition-transform group-open/stack:rotate-180"
              aria-hidden="true"
            />
            Stack trace
          </summary>
          <pre className="mt-2 max-h-32 overflow-auto error-log-scroll rounded-md border border-line bg-teal-950 p-3 font-mono text-[0.72rem] leading-5 text-ink-lo">
            {error.stack.join("\n")}
          </pre>
        </details>

        {/* Meta grid */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
          {(
            [
              ["Timestamp", error.meta.timestamp],
              ["Route", error.meta.route],
              ["Runtime", error.meta.runtime],
              ["Code", error.meta.code],
              ["Request", error.meta.requestId],
              ["Framework", error.meta.framework],
            ] as const
          ).map(([k, v]) => (
            <div key={k}>
              <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-ink-lo">
                {k}
              </dt>
              <dd className="truncate font-mono text-[0.75rem] text-ink-body" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>

        {/* Suggested fix + copy */}
        <div className="flex items-start justify-between gap-3 border-t border-line/60 pt-3">
          <p className="font-mono text-[0.72rem] leading-5 text-ink-body">
            <span className="text-mint">Suggested fix:</span> {error.hint}
          </p>
          <CopyButton getText={() => errorToText(error)} label={`Copy details for ${error.name}`} />
        </div>
      </div>
    </details>
  );
}

export function ErrorDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const counts = errorCounts(PLAYGROUND_ERRORS);
  const badge = `${counts.errors} error${counts.errors === 1 ? "" : "s"}, ${counts.warnings} warning${counts.warnings === 1 ? "" : "s"}`;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="error-dialog-title"
      aria-modal="true"
      onClose={onClose}
      onClick={(e) => {
        // Click on the dialog element itself = backdrop click.
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto max-h-[85dvh] w-[min(720px,calc(100vw-2rem))] overflow-hidden rounded-md border border-danger bg-teal-950 p-0 text-ink-body backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-dialog-in motion-reduce:open:animate-none"
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-danger-deep bg-danger-tint px-4 py-3">
        <TriangleAlert size={18} className="shrink-0 text-danger" aria-hidden="true" />
        <h2
          id="error-dialog-title"
          className="font-mono text-sm font-bold uppercase tracking-widest text-danger"
        >
          Errors detected
        </h2>
        <span className="rounded-pill border border-danger/50 bg-danger-tint px-2.5 py-0.5 font-mono text-[0.7rem] font-bold text-danger">
          {badge}
        </span>
        <Button
          variant="icon"
          className="ml-auto h-8 w-8"
          onClick={onClose}
          aria-label="Close error report"
        >
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {/* Body — only this region scrolls */}
      <div className="error-log-scroll max-h-[calc(85dvh-8rem)] space-y-3 overflow-y-auto p-4">
        {PLAYGROUND_ERRORS.map((e, i) => (
          <ErrorCard key={e.id} error={e} defaultOpen={i === 0} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-line px-4 py-3">
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(allErrorsText(PLAYGROUND_ERRORS));
            } catch {
              /* clipboard unavailable */
            }
          }}
        >
          <Copy size={14} aria-hidden="true" />
          Copy all
        </Button>
        <span className="mr-auto font-mono text-[0.7rem] text-ink-lo">{badge}</span>
        <Button variant="danger" onClick={onClose}>
          Dismiss
        </Button>
      </div>
    </dialog>
  );
}
