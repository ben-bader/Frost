import { useState, useEffect } from "react";

// Renders "no" on the server and flips to "yes" once the client takes over.
export function HydrationFlag(): React.JSX.Element {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);
  return <>{hydrated ? "yes" : "no"}</>;
}
