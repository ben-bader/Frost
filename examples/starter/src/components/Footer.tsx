import React from "react";

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
          {/* No public repo/docs/license URLs exist yet — rendered as text until destinations are known */}
          <span>GitHub</span>
          <span>Docs</span>
          <span>License</span>
        </nav>
      </div>
    </footer>
  );
}
