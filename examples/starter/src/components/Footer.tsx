import React from "react";

// No repository URL exists in package.json, so no GitHub link is rendered.
export function Footer(): React.JSX.Element {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer__inner">
        <div className="site-footer__brand">
          <a href="/" aria-label="Frost home">
            <img className="footer-logo" src="/frost-mark.png" alt="" width={30} height={24} />
          </a>
          <span className="version">v0.1.0</span>
        </div>
        <nav className="footer-links" aria-label="Footer">
          <a href="/">Demo</a>
          <a href="/playground">Playground</a>
        </nav>
      </div>
    </footer>
  );
}
