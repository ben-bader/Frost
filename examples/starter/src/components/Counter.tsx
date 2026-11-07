import { useState } from "react";

export function Counter(): React.JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <div className="counter">
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => setCount((c) => c - 1)}
        aria-label="Decrement"
      >
        −
      </button>
      <span className="counter__value" aria-live="polite" aria-atomic="true">
        {count}
      </span>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => setCount((c) => c + 1)}
        aria-label="Increment"
      >
        +
      </button>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => setCount(0)}
      >
        Reset
      </button>
    </div>
  );
}
