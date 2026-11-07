import React from "react";
import { usePathname, useFrostContext } from "@frostjs/react";

const navItems = [
  { label: "Overview", href: "/" },
  { label: "Examples", href: "/examples" },
  { label: "Playground", href: "/playground" },
];

export function Header(): React.JSX.Element {
  const pathname = usePathname();
  const ctx = useFrostContext();

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <a href="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
            <span className="brand__name">Frost</span>
            <span className="brand__tag">framework</span>
          </span>
        </a>

        <nav className="site-nav" aria-label="Primary">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`site-nav__link${active ? " site-nav__link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <span className="runtime-badge">
          <span className="runtime-badge__dot" aria-hidden="true" />
          {ctx.pathname ? `SSR · ${ctx.pathname}` : "SSR"}
        </span>
      </div>
    </header>
  );
}
