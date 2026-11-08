// Route: /playground — no loader; the page is a client island.
// Component lives at the bottom of this file; the bento tiles are in
// src/components/bento/ and hydrate on the client.

import { useState } from "react";
import type { Route } from "@frostjs/core";
import { CounterTile } from "../../components/bento/CounterTile.js";
import { TerminalTile } from "../../components/bento/TerminalTile.js";
import { BrowserTile } from "../../components/bento/BrowserTile.js";

export const metadata: Route.Metadata = {
  title: "Playground — Frost",
  description: "A Frost playground: client state, a fake terminal, and an error report.",
};

export default function PlaygroundPage(): React.JSX.Element {
  // Incrementing runId replays the error sequence in the terminal + browser tiles.
  const [runId, setRunId] = useState(0);

  return (
    <section
      className="h-full min-h-0 overflow-y-auto px-[clamp(20px,5vw,48px)] py-4"
      aria-labelledby="pg-title"
    >
      <h1 className="sr-only" id="pg-title">
        Playground
      </h1>
      <div className="mx-auto grid h-full min-h-0 w-full max-w-[1400px] grid-cols-1 gap-[18px] min-[900px]:grid-cols-[0.8fr_1.5fr] min-[900px]:grid-rows-2">
        <div className="min-h-[360px] min-[900px]:row-span-2 min-[900px]:min-h-0">
          <CounterTile onTriggerError={() => setRunId((r) => r + 1)} />
        </div>
        <div className="min-h-[360px] min-[900px]:min-h-0">
          <TerminalTile runId={runId} />
        </div>
        <div className="min-h-[360px] min-[900px]:min-h-0">
          <BrowserTile runId={runId} />
        </div>
      </div>
    </section>
  );
}
