import type { ReactNode } from "react";
import { useFrostContext, type FrostClientState } from "./context.js";

export interface FrostDocumentProps {
  children?: ReactNode;
  title?: string;
  head?: ReactNode;
}

export function FrostDocument({ children, title, head }: FrostDocumentProps): React.JSX.Element {
  const ctx = useFrostContext();
  const clientState: FrostClientState = ctx ?? {
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
    params: {},
    loaderData: null,
  };

  // Safely serialize initial data for client hydration without XSS vulnerabilities.
  const serializedState = JSON.stringify(clientState).replace(/</g, "\\u003c");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="alternate icon" href="/favicon.ico" />
        {title && <title>{title}</title>}
        {ctx.assets?.preloads?.map((preload) => (
          <link
            key={preload.href}
            rel="preload"
            href={preload.href}
            as={preload.as}
            type={preload.type}
            crossOrigin={preload.crossOrigin ? "anonymous" : undefined}
          />
        ))}
        {ctx.assets?.css?.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {head}
      </head>
      <body>
        <div id="__frost">{children}</div>
        <script
          id="__FROST_DATA__"
          type="application/json"
          nonce={ctx.cspNonce}
          dangerouslySetInnerHTML={{ __html: serializedState }}
        />
        {ctx.assets?.scripts?.map((src) => (
          <script key={src} type="module" src={src} nonce={ctx.cspNonce} />
        ))}
      </body>
    </html>
  );
}
