import { Link, usePathname } from "@frostjs/react";
import { pillPrimary } from "./Button.js";
import { SITE } from "../config/site.js";
import { NAV_ITEMS, type NavItem } from "../config/nav.js";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

const navLinkBase =
  "relative inline-flex items-center min-h-10 font-sans text-[0.9375rem] font-medium text-ink-hi transition-colors duration-150 hover:text-mint after:absolute after:left-1/2 after:top-[calc(100%+2px)] after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-ink-hi after:scale-0 after:transition-transform after:duration-150";

export function Header({ items = NAV_ITEMS }: { items?: NavItem[] }): React.JSX.Element {
  const pathname = usePathname();

  return (
    <header className="relative z-10 h-[88px]">
      <div className="mx-auto grid h-full w-full max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center px-[clamp(20px,5vw,48px)]">
        <Link
          to="/"
          className="inline-flex items-center gap-3 justify-self-start"
          aria-label="Frost home"
        >
          <img className="block h-8 w-[37px]" src="/frost-mark.png" alt="" width={37} height={32} />
          <img
            className="block h-[22px] w-[118px]"
            src="/frost-wordmark.png"
            alt="Frost"
            width={118}
            height={22}
          />
        </Link>

        <nav
          className="hidden items-center gap-8 justify-self-center min-[640px]:flex"
          aria-label="Primary"
        >
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? "page" : undefined}
                className={`${navLinkBase} ${active ? "after:scale-100" : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-self-end">
          <a
            className={pillPrimary}
            href={SITE.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get started on GitHub (opens in a new tab)"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
