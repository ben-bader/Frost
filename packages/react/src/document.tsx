import type { ReactNode } from "react";
import { useFrostContext } from "./context.js";

export interface FrostDocumentProps {
  children?: ReactNode;
  title?: string;
}

export function FrostDocument({ children, title }: FrostDocumentProps): React.JSX.Element {
  const ctx = useFrostContext();

  // Safely serialize initial data for client hydration without XSS vulnerabilities
  const serializedState = JSON.stringify(ctx).replace(/</g, "\\u003c");

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {title && <title>{title}</title>}
        {ctx.assets?.css?.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body>
        <div id="__frost">{children}</div>
        <script
          id="__FROST_DATA__"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: serializedState }}
        />
        {ctx.assets?.scripts?.map((src) => (
          <script key={src} type="module" src={src} />
        ))}
      </body>
    </html>
  );
}
