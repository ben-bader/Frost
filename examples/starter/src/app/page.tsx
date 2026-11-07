import type { Route } from "@frostjs/core";
import { Link } from "@frostjs/react";
import { pillGhost, pillPrimary } from "../components/Button.js";

export const metadata: Route.Metadata = {
  title: "Frost — React rendering, web-native runtime",
  description:
    "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
};

const cueDots = [1, 2, 4, 5, 6, 8]; // 3x3 grid, corners omitted

export default function DemoPage(): React.JSX.Element {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-[clamp(20px,5vw,48px)] py-8" aria-labelledby="hero-title">
      <div className="flex max-w-[760px] flex-col items-center text-center">
        <span className="mb-4 h-8 w-px bg-ink-body motion-safe:animate-hero-rise" />
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-ink-body motion-safe:animate-hero-rise [animation-delay:80ms]">
          Frost framework.
        </p>
        <h1
          id="hero-title"
          className="mt-3 text-balance font-medium leading-[1.05] tracking-[-0.015em] text-ink-hi motion-safe:animate-hero-rise [animation-delay:160ms] [font-size:clamp(2rem,5vw,4.5rem)]"
        >
          React rendering. Web-native runtime.
        </h1>
        <p className="mt-5 max-w-[46ch] text-base leading-[1.65] text-ink-body motion-safe:animate-hero-rise [animation-delay:240ms]">
          Frost keeps execution explicit: server loaders, client hydration,
          route contracts, and runtime boundaries stay visible, testable,
          and predictable.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 motion-safe:animate-hero-rise [animation-delay:320ms]">
          <Link className={pillPrimary} to="/playground">Open playground</Link>
          <Link className={pillGhost} to="/playground">Run it locally</Link>
        </div>
        {/* Decorative dot grid — aria-hidden, corners omitted */}
        <div
          className="mt-7 grid grid-cols-3 gap-1.5 motion-safe:animate-hero-rise [animation-delay:400ms]"
          aria-hidden="true"
        >
          {Array.from({ length: 9 }, (_, i) =>
            cueDots.includes(i) ? (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-mint motion-safe:animate-cue-pulse"
                style={{ animationDelay: `${(i % 3) * 120 + Math.floor(i / 3) * 200}ms` }}
              />
            ) : (
              <span key={i} className="h-1.5 w-1.5" />
            )
          )}
        </div>
      </div>
    </section>
  );
}
