import { useState } from "react";
import { Hash, Minus, Plus, RotateCcw, Zap } from "lucide-react";
import { Tile } from "./Tile.js";

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-ink-body transition-colors duration-150 hover:border-mint/50 hover:text-mint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
    >
      {children}
    </button>
  );
}

export function CounterTile({
  onTriggerError,
}: {
  onTriggerError: () => void;
}): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <Tile icon={Hash} label="Counter" chip="client component">
      <div className="flex h-full flex-col items-center justify-center gap-5 px-4">
        <span
          className="font-mono font-normal leading-none text-ink-hi tabular-nums [font-size:clamp(80px,16vh,180px)]"
          aria-live="polite"
          aria-atomic="true"
        >
          {count}
        </span>
        <div className="flex items-center gap-3">
          <RoundButton label="Decrement" onClick={() => setCount((c) => c - 1)}>
            <Minus size={18} aria-hidden="true" />
          </RoundButton>
          <RoundButton label="Increment" onClick={() => setCount((c) => c + 1)}>
            <Plus size={18} aria-hidden="true" />
          </RoundButton>
          <RoundButton label="Reset counter" onClick={() => setCount(0)}>
            <RotateCcw size={16} aria-hidden="true" />
          </RoundButton>
        </div>
        <button
          type="button"
          onClick={onTriggerError}
          className="inline-flex h-10 items-center gap-2 rounded-pill border border-danger/70 px-5 font-mono text-xs font-bold uppercase tracking-wider text-danger transition-colors duration-150 hover:bg-danger-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
        >
          <Zap size={14} aria-hidden="true" />
          Trigger error
        </button>
      </div>
    </Tile>
  );
}
