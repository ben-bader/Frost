import React from "react";
import { Link, usePathname } from "@frostjs/react";

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
        <Link to="/" className="brand" aria-label="Frost home">
          <img className="brand__mark" src="/frost-mark.png" alt="" width={37} height={32} />
          <img className="brand__wordmark" src="/frost-wordmark.png" alt="Frost" width={118} height={22} />
        </Link>

        <nav className="primary-nav" aria-label="Primary">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className="nav-link"
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="header-actions">
          <Link className="pill pill--filled" to="/playground">Get started</Link>
        </div>
      </div>
    </header>
  );
}
