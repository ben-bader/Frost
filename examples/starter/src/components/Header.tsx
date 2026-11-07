import React, { useState } from "react";
import { usePathname } from "@frostjs/react";

const navItems = [
  { label: "Overview", href: "/" },
  { label: "Examples", href: "/examples" },
  { label: "Playground", href: "/playground" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="wrap site-header__inner">
        <a href="/" className="brand" aria-label="Frost home">
          <img className="brand__mark" src="/frost-mark.png" alt="" width={36} height={28} />
          <img className="brand__wordmark" src="/frost-wordmark.png" alt="Frost" width={109} height={20} />
        </a>

        <nav className="primary-nav" aria-label="Primary">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`nav-link${active ? " nav-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="header-meta">
          <span className="version">v0.1.0</span>
          <button
            type="button"
            className="menu-btn"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="mobile-nav" id="mobile-nav" aria-label="Mobile">
          <ul>
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
