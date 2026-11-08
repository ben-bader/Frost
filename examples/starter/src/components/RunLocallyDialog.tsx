import { useEffect, useRef, useState } from "react";
import { Terminal, X, Copy, Check } from "lucide-react";
import { SITE } from "../config/site.js";

function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div className="flex items-stretch overflow-hidden rounded-xl border border-white/15 bg-black/30">
      <code className="flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap px-4 py-3 font-mono text-[0.8rem] leading-6 text-ink-hi error-log-scroll">
        <span className="mr-2 select-none text-ink-dim" aria-hidden="true">
          $
        </span>
        {command}
      </code>
      <button
        type="button"
        aria-label={copied ? "Copied" : `Copy command: ${command}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(command);
            setCopied(true);
            window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), 1400);
          } catch {
            /* clipboard unavailable */
          }
        }}
        className="grid w-11 shrink-0 place-items-center border-l border-white/15 text-ink-lo transition-colors duration-150 hover:bg-white/5 hover:text-mint focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-mint"
      >
        {copied ? (
          <>
            <Check size={15} className="text-mint" aria-hidden="true" />
            <span className="sr-only">Copied</span>
          </>
        ) : (
          <Copy size={15} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function RunLocallyDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}): React.JSX.Element {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { node, packageManager } = SITE.requirements;

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(SITE.steps.map((s) => s.command).join("\n"));
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="run-locally-title"
      aria-modal="true"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto max-h-[85dvh] w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-mint/45 bg-deep p-0 text-ink-body shadow-[0_0_0_1px_rgb(16_232_200/0.15),0_24px_60px_rgb(0_0_0/0.55)] backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-dialog-in motion-reduce:open:animate-none"
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-3.5">
        <Terminal size={16} className="text-mint" aria-hidden="true" />
        <h2 id="run-locally-title" className="font-sans text-sm font-medium text-ink-hi">
          Run Frost locally
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="ml-auto grid h-8 w-8 place-items-center rounded-pill border border-white/15 text-ink-lo transition-colors duration-150 hover:bg-white/5 hover:text-ink-hi focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Body — scrolls inside on short viewports */}
      <div className="error-log-scroll max-h-[calc(85dvh-8.5rem)] space-y-5 overflow-y-auto px-5 py-5">
        <p className="text-sm leading-6 text-ink-body">
          You need {node} and {packageManager} installed. Run these commands in order from a
          terminal.
        </p>

        {SITE.steps.map((step) => (
          <div key={step.label}>
            <p className="mb-1.5 font-mono text-[0.65rem] font-bold uppercase tracking-[0.14em] text-ink-lo">
              {step.label}
            </p>
            {step.note ? (
              <p className="font-mono text-[0.75rem] text-ink-dim">{step.note}</p>
            ) : (
              <CommandBlock command={step.command} />
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-white/10 px-5 py-3.5">
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill border border-mint/60 px-4 font-mono text-[0.7rem] font-bold uppercase tracking-wider text-mint transition-colors duration-150 hover:bg-mint/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
        >
          <Copy size={13} aria-hidden="true" />
          Copy all
        </button>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center rounded-pill bg-mint px-4 font-mono text-[0.7rem] font-bold uppercase tracking-wider text-mint-ink transition-colors duration-150 hover:bg-mint-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
