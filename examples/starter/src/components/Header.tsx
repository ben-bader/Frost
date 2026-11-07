import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "@frostjs/react";

const navItems = [
  { label: "Overview", href: "/" },
  { label: "Examples", href: "/examples" },
  { label: "Playground", href: "/playground" },
];

const moreItems = [
  { label: "SSR", href: "/examples" },
  { label: "Hydration", href: "/examples" },
  { label: "API", href: "/examples" },
  { label: "Adapter", href: "/playground" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  // Header scroll state — no re-render, just a data attribute
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const onScroll = () => {
      el.toggleAttribute("data-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close disclosures on outside click / Escape
  useEffect(() => {
    if (!moreOpen && !menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (moreOpen && !headerRef.current?.querySelector(".nav-more")?.contains(target)) {
        setMoreOpen(false);
      }
      if (menuOpen && !headerRef.current?.querySelector(".mobile-nav")?.contains(target) &&
          !menuBtnRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (moreOpen) setMoreOpen(false);
        if (menuOpen) {
          setMenuOpen(false);
          menuBtnRef.current?.focus();
        }
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [moreOpen, menuOpen]);

  return (
    <header className="site-header" ref={headerRef}>
      <div className="wrap site-header__inner">
        <a href="/" className="brand" aria-label="Frost home">
          <img className="brand__mark" src="/frost-mark.png" alt="" width={37} height={32} />
          <img className="brand__wordmark" src="/frost-wordmark.png" alt="Frost" width={118} height={22} />
        </a>

        <nav className="primary-nav" aria-label="Primary">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className="nav-link"
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
          <div
            className="nav-more"
            data-open={moreOpen || undefined}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setMoreOpen(false);
            }}
          >
            <button
              type="button"
              className="nav-more__btn"
              aria-expanded={moreOpen}
              aria-controls="nav-more-panel"
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <path d="M2 4l4 4 4-4" />
              </svg>
            </button>
            {moreOpen && (
              <div className="nav-more__panel" id="nav-more-panel">
                {moreItems.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMoreOpen(false)}>
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="header-actions">
          <a className="pill pill--outline" href="/">GitHub</a>
          <a className="pill pill--filled" href="/examples">Get started</a>
        </div>

        <button
          type="button"
          className="pill pill--outline menu-btn"
          ref={menuBtnRef}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </div>

      {menuOpen && (
        <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile">
          <ul>
            {[...navItems, ...moreItems].map((item, i) => (
              <li key={`${item.label}-${i}`}>
                <a href={item.href} onClick={() => setMenuOpen(false)}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mobile-nav__actions">
            <a className="pill pill--outline" href="/">GitHub</a>
            <a className="pill pill--filled" href="/examples">Get started</a>
          </div>
        </nav>
      )}

      {/* No-JS fallback: disclosure panels need JS, so show the links plainly */}
      <noscript>
        <nav aria-label="Fallback" style={{ padding: "0 var(--gutter) var(--space-4)" }}>
          {[...navItems, ...moreItems].map((item, i) => (
            <a key={`${item.label}-${i}`} href={item.href} style={{ display: "inline-block", marginRight: "var(--space-4)", color: "var(--text-body)" }}>
              {item.label}
            </a>
          ))}
        </nav>
      </noscript>
    </header>
  );
}
