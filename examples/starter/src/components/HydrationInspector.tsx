import { useState, useEffect } from "react";
import { useFrostContext } from "@frostjs/react";
import { CopyButton } from "./CopyButton.js";

export function HydrationInspector(): React.JSX.Element {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hydrationTime, setHydrationTime] = useState<string>("");
  const ctx = useFrostContext();

  useEffect(() => {
    setIsHydrated(true);
    setHydrationTime(new Date().toLocaleTimeString());
  }, []);

  const serialized = JSON.stringify(
    { pathname: ctx.pathname, params: ctx.params, loaderData: ctx.loaderData },
    null,
    2
  );

  return (
    <div>
      <div className="hydration-status">
        <span className={`hydration-status__dot${isHydrated ? " hydration-status__dot--live" : ""}`} aria-hidden="true" />
        <div>
          <div className="hydration-status__title">
            {isHydrated ? "Hydration complete" : "Hydration pending"}
          </div>
          <div className="body-sm">
            {isHydrated ? `React hydrateRoot finished at ${hydrationTime}.` : "Waiting for the client entry module."}
          </div>
        </div>
        <span className="tag" style={{ marginLeft: "auto" }}>{isHydrated ? "hydrated" : "pending"}</span>
      </div>

      <div className="panel">
        <div className="panel__head">
          <div className="panel__title">Serialized route state</div>
          <CopyButton text={serialized} label="Copy state" />
        </div>
        <pre className="code-block--wrap" style={{ background: "var(--trench)", border: "var(--rule)", borderRadius: "var(--radius)", padding: "var(--space-4)", overflowX: "auto", maxHeight: 260 }}>{serialized}</pre>
      </div>
    </div>
  );
}
