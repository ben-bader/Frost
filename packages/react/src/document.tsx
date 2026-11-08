import type { ReactNode } from "react";
import { useFrostContext, type FrostClientState } from "./context.js";

export interface FrostDocumentProps {
  children?: ReactNode;
  title?: string;
  head?: ReactNode;
  /** html lang attribute (a11y). Defaults to "en". */
  lang?: string;
  /** Client-router route manifest (emitted as window.__FROST_ROUTES__). */
  routeManifest?: unknown;
}

const SKIP_LINK_STYLE =
  ".frost-skip-link{position:absolute;left:-9999px;top:0;z-index:2147483647;background:#0b1517;color:#e8f4f1;padding:10px 16px;border-radius:0 0 8px 0;font:600 14px/1.2 system-ui,sans-serif;text-decoration:none}.frost-skip-link:focus{left:0;outline:2px solid #10e8c8}";

export function FrostDocument({ children, title, head, lang, routeManifest }: FrostDocumentProps): React.JSX.Element {
  const ctx = useFrostContext();
  const clientState: FrostClientState = ctx ?? {
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
    params: {},
    loaderData: null,
  };

  // Safely serialize initial data for client hydration without XSS vulnerabilities.
  const serializedState = JSON.stringify(clientState).replace(/</g, "\\u003c");
  const serializedRoutes = routeManifest
    ? JSON.stringify(routeManifest).replace(/</g, "\\u003c")
    : null;

  return (
    <html lang={lang ?? "en"}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style nonce={ctx.cspNonce} dangerouslySetInnerHTML={{ __html: SKIP_LINK_STYLE }} />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="alternate icon" href="/favicon.ico" />
        {title && <title>{title}</title>}
        {ctx.assets?.preloads?.map((preload) => (
          <link
            key={preload.href}
            rel={preload.rel ?? "preload"}
            href={preload.href}
            as={preload.rel === "modulepreload" ? undefined : preload.as}
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
        <a className="frost-skip-link" href="#__frost">
          Skip to content
        </a>
        <main id="__frost" tabIndex={-1}>
          {children}
        </main>
        <script
          id="__FROST_DATA__"
          type="application/json"
          nonce={ctx.cspNonce}
          dangerouslySetInnerHTML={{ __html: serializedState }}
        />
        {serializedRoutes && (
          <script
            id="__FROST_ROUTES__"
            type="application/json"
            nonce={ctx.cspNonce}
            dangerouslySetInnerHTML={{ __html: serializedRoutes }}
          />
        )}
        {ctx.assets?.scripts?.map((src) => (
          <script key={src} type="module" src={src} nonce={ctx.cspNonce} />
        ))}
      </body>
    </html>
  );
}
