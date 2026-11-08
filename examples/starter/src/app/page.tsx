import { useState } from "react";
import type { Route } from "@frostjs/core";
import { Link } from "@frostjs/react";
import { pillGhost, pillPrimary } from "../components/Button.js";
import { RunLocallyDialog } from "../components/RunLocallyDialog.js";

export const metadata: Route.Metadata = {
  title: "Frost — React rendering, web-native runtime",
  description:
    "Frost keeps execution explicit: server loaders, client hydration, route contracts, and runtime boundaries stay visible, testable, and predictable.",
};

export default function DemoPage(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <section
      className="flex min-h-0 flex-1 items-center justify-center px-[clamp(20px,5vw,48px)] py-8"
      aria-labelledby="hero-title"
    >
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
          Frost keeps execution explicit: server loaders, client hydration, route contracts, and
          runtime boundaries stay visible, testable, and predictable.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3 motion-safe:animate-hero-rise [animation-delay:320ms]">
          <Link className={pillPrimary} to="/playground">
            Open playground
          </Link>
          <button type="button" className={pillGhost} onClick={() => setDialogOpen(true)}>
            Run it locally
          </button>
        </div>
      </div>
      <RunLocallyDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
