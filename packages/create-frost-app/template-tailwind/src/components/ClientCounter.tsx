import { useState } from "react";

export function ClientCounter(): React.JSX.Element {
  const [count, setCount] = useState(0);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => setCount((c) => c - 1)}>
        -
      </button>
      <output aria-live="polite">{count}</output>
      <button type="button" onClick={() => setCount((c) => c + 1)}>
        +
      </button>
      <button type="button" onClick={() => setCount(0)}>
        reset
      </button>
    </div>
  );
}
