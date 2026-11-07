import React from "react";
import type { Route } from "@frostjs/core";
import { Link } from "@frostjs/react";

export const metadata: Route.Metadata = {
  title: "Frost — React rendering, web-native runtime",
  description:
    "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
};

const cuePositions = [0, 1, 2, 3, 4, 5, 6, 7, 8];

export default function DemoPage(): React.JSX.Element {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="wrap">
        <div className="hero__stack">
          <span className="hero__rule" style={{ "--i": 0 } as React.CSSProperties} />
          <p className="eyebrow" style={{ "--i": 1 } as React.CSSProperties}>
            Frost framework.
          </p>
          <h1 className="display" id="hero-title" style={{ "--i": 2 } as React.CSSProperties}>
            React rendering. Web-native runtime.
          </h1>
          <p className="hero__lede" style={{ "--i": 3 } as React.CSSProperties}>
            Frost keeps execution explicit: server loaders, client hydration,
            route contracts, and runtime boundaries stay visible, testable,
            and predictable.
          </p>
          <div className="hero__actions" style={{ "--i": 4 } as React.CSSProperties}>
            <Link className="btn btn--primary" to="/playground">Open playground</Link>
            <Link className="btn btn--secondary" to="/playground">Run it locally</Link>
          </div>
          {/* Decorative dot grid — the page ends at the hero, so no scroll target */}
          <div className="cue hero__cue" style={{ "--i": 5 } as React.CSSProperties} aria-hidden="true">
            {cuePositions.map((i) =>
              i === 0 || i === 8 ? (
                <span key={i} />
              ) : (
                <span
                  key={i}
                  className="cue__dot"
                  style={{ "--d": `${(i % 3) * 120 + Math.floor(i / 3) * 200}ms` } as React.CSSProperties}
                />
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
