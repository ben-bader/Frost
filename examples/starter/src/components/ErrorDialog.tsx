import { useEffect, useRef, useState } from "react";

const LOG_LINES = [
  ["ERROR", "loader /playground failed: 500", "err"],
  ["ERROR", "hydration mismatch in <Counter>", "err"],
  ["WARN ", 'route contract missing field "count"', "warn"],
  ["ERROR", "runtime boundary crossed: server -> client", "err"],
  ["ERROR", "unhandled rejection: fetch failed", "err"],
] as const;

type LogEntry = { ts: string; level: string; message: string; cls: string };

function stamp(base: number, offsetMs: number): string {
  return new Date(base + offsetMs).toISOString().slice(11, 23);
}

export function ErrorDialog({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element | null {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [entries, setEntries] = useState<LogEntry[] | null>(null);

  useEffect(() => {
    if (open && dialogRef.current && !dialogRef.current.open) {
      // Timestamp the demo entries once, on first open — never during SSR.
      if (entries === null) {
        const base = Date.now();
        setEntries(
          LOG_LINES.map(([level, message, cls], i) => ({
            ts: stamp(base, i * 137),
            level,
            message,
            cls,
          }))
        );
      }
      dialogRef.current.showModal();
    } else if (!open && dialogRef.current?.open) {
      dialogRef.current.close();
    }
  }, [open, entries]);

  // Native <dialog> provides focus trapping, Escape, and ::backdrop.
  // Close on backdrop click: clicks landing on the dialog element itself.
  return (
    <dialog
      ref={dialogRef}
      className="error-dialog"
      aria-labelledby="error-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="error-dialog__head">
        <svg
          className="error-dialog__icon"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M8 1.5 15 14H1L8 1.5Z" />
          <path d="M8 6.5v3.5" />
          <circle cx="8" cy="12" r="0.6" fill="currentColor" stroke="none" />
        </svg>
        <span className="error-dialog__title" id="error-dialog-title">
          Errors detected
        </span>
        <button
          type="button"
          className="error-dialog__close"
          onClick={onClose}
          aria-label="Close error log"
        >
          ×
        </button>
      </div>
      <div className="error-dialog__body">
        <pre className="error-log" tabIndex={0} aria-label="Error log">
          {entries?.map((e) => (
            <span key={e.ts}>
              <span className="ts">{e.ts} </span>
              <span className={e.cls}>{e.level}</span> {e.message}
              {"\n"}
            </span>
          )) ?? "Waiting for client…\n"}
        </pre>
      </div>
      <div className="error-dialog__foot">
        <button type="button" className="btn btn--secondary" onClick={onClose}>
          Dismiss
        </button>
      </div>
    </dialog>
  );
}
