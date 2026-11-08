import { type AnchorHTMLAttributes, forwardRef } from "react";

/**
 * Route map for typed links. Frost generates `.frost/types/routes.d.ts`
 * which augly augments this interface with concrete route paths, giving
 * `Link`/`href` autocomplete. `(string & {})` keeps arbitrary strings
 * assignable for dynamic routes and external URLs.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmentation point for generated route types
export interface FrostRouteMap {}

export type FrostHref = [keyof FrostRouteMap] extends [never]
  ? string
  : (keyof FrostRouteMap & string) | (string & {});

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: FrostHref;
  href?: FrostHref;
  prefetch?: boolean;
}

// Frost hydrates each route as a separate document — there is no client-side
// router, so Link renders a real anchor and lets the browser perform a full
// navigation. Client-side route transitions are not supported yet.
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, href, children, prefetch: _prefetch, ...rest },
  ref,
) {
  const targetUrl = to || href || "#";

  return (
    <a ref={ref} href={targetUrl} {...rest}>
      {children}
    </a>
  );
});
