import { type AnchorHTMLAttributes, type MouseEvent, forwardRef } from "react";

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  to?: string;
  href?: string;
  prefetch?: boolean;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { to, href, children, onClick, ...rest },
  ref
) {
  const targetUrl = to || href || "#";

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e);

    // Intercept standard left-clicks without modifier keys on relative URLs
    if (
      !e.defaultPrevented &&
      e.button === 0 &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.shiftKey &&
      !e.altKey &&
      targetUrl.startsWith("/") &&
      !targetUrl.startsWith("//")
    ) {
      e.preventDefault();
      // Navigate to destination
      if (window.location.pathname !== targetUrl) {
        window.history.pushState({}, "", targetUrl);
        // Dispatch popstate event to trigger router state updates
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  };

  return (
    <a ref={ref} href={targetUrl} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
});
