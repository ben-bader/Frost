import { useState } from "react";

export interface CounterProps {
  initialCount?: number;
}

export function Counter({ initialCount = 0 }: CounterProps) {
  const [count, setCount] = useState(initialCount);

  return (
    <div style={{ border: "1px solid #ccc", padding: "16px", borderRadius: "8px", margin: "16px 0" }}>
      <h3>Interactive Client Counter</h3>
      <p>Current Count: <strong>{count}</strong></p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" onClick={() => setCount((c) => c - 1)}>
          Decrement -
        </button>
        <button type="button" onClick={() => setCount((c) => c + 1)}>
          Increment +
        </button>
      </div>
    </div>
  );
}

