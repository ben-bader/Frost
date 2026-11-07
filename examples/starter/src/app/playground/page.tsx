// Route: /playground — no loader; the page is a client island.
// Component lives at the bottom of this file; interactive pieces are in
// src/components/ (Counter, ErrorDialog) and hydrate on the client.

import { useEffect, useRef, useState } from "react";
import type { Route } from "@frostjs/core";
import { TriangleAlert } from "lucide-react";
import { Counter } from "../../components/Counter.js";
import { ErrorDialog } from "../../components/ErrorDialog.js";
import { Button } from "../../components/Button.js";

export const metadata: Route.Metadata = {
  title: "Playground — Frost",
  description: "A minimal Frost playground: client state and error logs.",
};

export default function PlaygroundPage(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = useState(false);
  const autoOpened = useRef(false);

  // Open the error report once per visit, ~700ms after load.
  useEffect(() => {
    if (autoOpened.current) return;
    autoOpened.current = true;
    const t = window.setTimeout(() => setDialogOpen(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 py-8"
      aria-labelledby="pg-title"
    >
      <h1 className="sr-only" id="pg-title">Playground</h1>
      <Counter />
      <Button variant="ghost" onClick={() => setDialogOpen(true)}>
        <TriangleAlert size={14} aria-hidden="true" />
        View error logs
      </Button>
      <ErrorDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </section>
  );
}
