import type { Route } from "@frost.js/core";
import { ClientCounter } from "../../components/ClientCounter.js";

export const metadata: Route.Metadata = {
  title: "Playground — __APP_NAME__",
};

export default function PlaygroundPage(): React.JSX.Element {
  return (
    <main>
      <h1>Playground</h1>
      <p>This page hydrates on the client — state survives edits in dev.</p>
      <ClientCounter />
    </main>
  );
}
