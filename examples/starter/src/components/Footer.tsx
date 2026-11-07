import React from "react";

export function Footer(): React.JSX.Element {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <span className="site-footer__brand">
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
