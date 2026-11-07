import React from "react";
import { usePathname } from "@frostjs/react";

const navItems = [
  { label: "Demo", href: "/" },
  { label: "Playground", href: "/playground" },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Header(): React.JSX.Element {
  const pathname = usePathname();

  return (
    <header className="site-header">
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
        </nav>

        <div className="header-actions">
          <a className="pill pill--filled" href="/#start">Get started</a>
        </div>

        {/* Native disclosure — the menu works with JavaScript disabled */}
        <details className="menu">
          <summary>Menu</summary>
          <div className="menu__panel">
            <ul>
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    aria-current={isActive(pathname, item.href) ? "page" : undefined}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="menu__actions">
              <a className="pill pill--filled" href="/#start">Get started</a>
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
