// Route: /playground — loader lives here if the page needs server data.
// Component lives at the bottom of this file; interactive pieces are in
// src/components/ (Counter, ErrorDialog) and hydrate on the client.

import React, { useEffect, useRef, useState } from "react";
import type { Route } from "@frostjs/core";
import { Counter } from "../../components/Counter.js";
import { ErrorDialog } from "../../components/ErrorDialog.js";

export const metadata: Route.Metadata = {
  title: "Playground — Frost",
  description: "A minimal Frost playground: client state and error logs.",
};

export default function PlaygroundPage(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const autoOpened = useRef(false);

  // Open the error log once per visit, ~700ms after load.
  useEffect(() => {
    if (autoOpened.current) return;
    autoOpened.current = true;
    const t = window.setTimeout(() => setDialogOpen(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section className="pg" aria-labelledby="pg-title">
      <h1 className="display" id="pg-title" style={{ fontSize: "clamp(2rem, 4vw, 3.25rem)" }}>
        Playground
      </h1>
      <Counter />
      <button
        type="button"
        className="btn btn--secondary"
        onClick={() => setDialogOpen(true)}
      >
        View error logs
      </button>
      <ErrorDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
