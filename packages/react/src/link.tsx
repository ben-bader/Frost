import { type AnchorHTMLAttributes, forwardRef } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
  prefetch?: boolean;
}

// Frost hydrates each route as a separate document — there is no client-side
// router, so Link renders a real anchor and lets the browser perform a full
// navigation. Client-side route transitions are not supported yet.
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, href, children, prefetch: _prefetch, ...rest },
  ref
) {
  const targetUrl = to || href || "#";

  return (
    <a ref={ref} href={targetUrl} {...rest}>
      {children}
    </a>
  );
});
