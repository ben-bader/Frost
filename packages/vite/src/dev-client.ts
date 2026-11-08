/**
 * Browser-side dev client injected into every dev HTML document.
 * Listens on Vite's HMR websocket for Frost protocol events:
 *   frost:error         -> show styled overlay
 *   frost:error-clear   -> hide overlay
 *   frost:reload        -> full page reload
 *   frost:css-update    -> refetch route stylesheets without reload
 *   frost:routes-changed-> route table rebuilt; reload to pick it up
 * Never included in production builds (served only by the dev plugin).
 */
export const DEV_CLIENT_ID = "/@frost/dev-client";
export const RESOLVED_DEV_CLIENT_ID = "\0" + DEV_CLIENT_ID;

export const DEV_CLIENT_CODE = `
(function () {
  "use strict";
  var hot = import.meta.hot;
  if (!hot) return;

  var overlay = null;

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    if (attrs) {
      for (var k in attrs) {
        if (k === "style" && typeof attrs[k] === "object") {
          for (var s in attrs[k]) node.style[s] = attrs[k][s];
        } else if (attrs[k] != null) {
          node.setAttribute(k, attrs[k]);
        }
      }
    }
    if (text != null) node.textContent = text;
    return node;
  }

  function injectStyles() {
    if (document.getElementById("__frost-overlay-styles")) return;
    var style = el("style", { id: "__frost-overlay-styles" });
    style.textContent =
      "#frost-error-overlay{position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(4,12,13,.72);backdrop-filter:blur(6px);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}" +
      "#frost-error-overlay .card{width:min(560px,100%);max-height:85dvh;overflow:auto;background:#1a0f12;border:1px solid #ff4d5e;border-radius:16px;box-shadow:0 0 0 1px rgba(255,77,94,.25),0 24px 80px rgba(0,0,0,.6);color:#e8f4f1;animation:frost-overlay-in .18s ease-out}" +
      "@keyframes frost-overlay-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}" +
      "#frost-error-overlay .head{display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid rgba(255,77,94,.25);background:rgba(255,77,94,.08)}" +
      "#frost-error-overlay .title{font-weight:600;font-size:14px}" +
      "#frost-error-overlay .chip{margin-left:auto;font-size:11px;padding:2px 8px;border-radius:999px;background:#ff4d5e;color:#1a0f12;font-weight:700}" +
      "#frost-error-overlay .body{padding:16px;display:flex;flex-direction:column;gap:12px}" +
      "#frost-error-overlay .errname{color:#ff4d5e;font-weight:700;font-size:14px}" +
      "#frost-error-overlay .msg{color:#b9c9c6;font-size:13px;line-height:1.5}" +
      "#frost-error-overlay .loc{color:#6f9390;font-size:12px}" +
      "#frost-error-overlay .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}" +
      "#frost-error-overlay .meta div{border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:8px 10px;background:rgba(255,255,255,.03)}" +
      "#frost-error-overlay .meta .k{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6f9390}" +
      "#frost-error-overlay .meta .v{font-size:12px;color:#e8f4f1;word-break:break-all}" +
      "#frost-error-overlay .hint{color:#ffb86b;font-size:12px}" +
      "#frost-error-overlay .stack{border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:10px;font-size:11px;color:#6f9390;white-space:pre-wrap;max-height:180px;overflow:auto}" +
      "#frost-error-overlay .foot{display:flex;gap:8px;padding:12px 16px;border-top:1px solid rgba(255,255,255,.08)}" +
      "#frost-error-overlay button{font:inherit;font-size:12px;padding:7px 14px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.15);background:transparent;color:#e8f4f1}" +
      "#frost-error-overlay button.primary{background:#10e8c8;border-color:#10e8c8;color:#04110f;font-weight:700}" +
      "#frost-error-overlay button:focus-visible{outline:2px solid #10e8c8;outline-offset:2px}" +
      "@media (prefers-reduced-motion:reduce){#frost-error-overlay .card{animation:none}}";
    document.head.appendChild(style);
  }

  function reportToText(r) {
    var lines = [];
    lines.push((r.name || "Error") + ": " + (r.message || ""));
    if (r.code) lines.push("code: " + r.code);
    if (r.location) lines.push("at: " + r.location);
    if (r.route) lines.push("route: " + r.route);
    if (r.runtime) lines.push("runtime: " + r.runtime);
    if (r.stack) lines.push("\\n" + r.stack);
    if (r.hint) lines.push("hint: " + r.hint);
    return lines.join("\\n");
  }

  function showError(report) {
    if (!report || typeof report !== "object") return;
    injectStyles();
    hideError();
    var wrap = el("div", {
      id: "frost-error-overlay",
      role: "alertdialog",
      "aria-modal": "true",
      "aria-labelledby": "frost-error-title",
    });
    var card = el("div", { className: "card" });

    var head = el("div", { className: "head" });
    head.appendChild(el("span", { style: { color: "#ff4d5e", fontSize: "16px" } }, "▲"));
    head.appendChild(el("span", { className: "title", id: "frost-error-title" }, "Errors detected"));
    if (report.severity === "warning") {
      head.appendChild(el("span", { className: "chip", style: { background: "#ffb86b" } }, "warning"));
    } else {
      head.appendChild(el("span", { className: "chip" }, "1 error"));
    }
    var closeX = el("button", {
      type: "button",
      "aria-label": "Dismiss",
      style: { marginLeft: "auto", border: "none", background: "transparent", fontSize: "14px", padding: "2px 6px" },
    }, "✕");
    closeX.addEventListener("click", hideError);
    head.appendChild(closeX);
    card.appendChild(head);

    var body = el("div", { className: "body" });
    var nameRow = el("div");
    nameRow.appendChild(el("span", { className: "errname" }, report.name || "Error"));
    nameRow.appendChild(el("span", { className: "msg" }, " " + (report.message || "")));
    body.appendChild(nameRow);
    if (report.location) {
      body.appendChild(el("div", { className: "loc" }, report.location));
    }
    var meta = el("div", { className: "meta" });
    function metaCell(k, v) {
      var d = el("div");
      d.appendChild(el("span", { className: "k" }, k));
      d.appendChild(el("span", { className: "v" }, v == null ? "—" : String(v)));
      meta.appendChild(d);
    }
    metaCell("Code", report.code);
    metaCell("Route", report.route);
    metaCell("Runtime", report.runtime);
    metaCell("Time", report.timestamp ? new Date(report.timestamp).toLocaleTimeString() : null);
    body.appendChild(meta);
    if (report.hint) {
      body.appendChild(el("div", { className: "hint" }, "Suggested fix: " + report.hint));
    }
    if (report.stack) {
      var det = el("details");
      det.appendChild(el("summary", { style: { cursor: "pointer", color: "#6f9390", fontSize: "11px" } }, "Stack trace"));
      det.appendChild(el("div", { className: "stack" }, report.stack));
      body.appendChild(det);
    }
    card.appendChild(body);

    var foot = el("div", { className: "foot" });
    var copyBtn = el("button", { type: "button", className: "primary" }, "Copy details");
    copyBtn.addEventListener("click", function () {
      var text = reportToText(report);
      try {
        navigator.clipboard.writeText(text).then(function () {
          copyBtn.textContent = "Copied";
          setTimeout(function () { copyBtn.textContent = "Copy details"; }, 1500);
        });
      } catch (e) { /* clipboard unavailable */ }
    });
    var dismissBtn = el("button", { type: "button" }, "Dismiss");
    dismissBtn.addEventListener("click", hideError);
    foot.appendChild(copyBtn);
    foot.appendChild(dismissBtn);
    card.appendChild(foot);

    wrap.appendChild(card);
    document.body.appendChild(wrap);
    overlay = wrap;

    function onKey(ev) {
      if (ev.key === "Escape") { hideError(); }
    }
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", function (ev) {
      if (ev.target === wrap) hideError();
    });
    overlay._keyHandler = onKey;
    var firstBtn = card.querySelector("button");
    if (firstBtn) firstBtn.focus();
  }

  function hideError() {
    if (overlay) {
      if (overlay._keyHandler) document.removeEventListener("keydown", overlay._keyHandler);
      overlay.remove();
      overlay = null;
    }
  }

  function bumpCss() {
    var links = document.querySelectorAll('link[href*="/@frost/css"]');
    var stamp = Date.now();
    links.forEach(function (link) {
      try {
        var u = new URL(link.href, location.origin);
        u.searchParams.set("t", String(stamp));
        link.href = u.pathname + u.search;
      } catch (e) { /* ignore */ }
    });
  }

  hot.on("frost:error", function (data) { showError(data); });
  hot.on("frost:error-clear", function () { hideError(); });
  hot.on("frost:reload", function () { location.reload(); });
  hot.on("frost:css-update", function () { bumpCss(); });
  hot.on("frost:routes-changed", function () { location.reload(); });
})();
`;
