import React from "react";

export function Footer(): React.JSX.Element {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span className="site-footer__brand">
          <svg className="brand__mark" viewBox="0 0 20 20" aria-hidden="true">
            <path
              d="M10 1.5 17.5 6v8L10 18.5 2.5 14V6L10 1.5Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          Frost <span className="version">v0.1.0</span>
        </span>
        <nav className="footer-links" aria-label="Footer">
          <a href="/">Overview</a>
          <a href="/examples">Examples</a>
          <a href="/playground">Playground</a>
        </nav>
      </div>
    </footer>
  );
}
