import { useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Button } from "./Button.js";

export function Counter(): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-5">
      <Button variant="icon" onClick={() => setCount((c) => c - 1)} aria-label="Decrement">
        <Minus size={18} aria-hidden="true" />
      </Button>
      <span
        className="min-w-[3ch] text-center font-mono text-6xl font-normal leading-none text-ink-hi tabular-nums sm:text-7xl"
        aria-live="polite"
        aria-atomic="true"
      >
        {count}
      </span>
      <Button variant="icon" onClick={() => setCount((c) => c + 1)} aria-label="Increment">
        <Plus size={18} aria-hidden="true" />
      </Button>
      <Button variant="icon" onClick={() => setCount(0)} aria-label="Reset counter">
        <RotateCcw size={16} aria-hidden="true" />
      </Button>
    </div>
  );
}
