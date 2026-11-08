import type { FrostClientState } from "./context.js";

/**
 * Opt-in client router (config.router.enabled). Intercepts same-origin
 * link clicks, loads the route's loader data via ?__frost_data=1 and
 * its JS/CSS chunks, then swaps the React tree without a document load.
 * Any failure falls back to a full navigation.
 */

interface RouteManifestEntry {
  id: string;
  pattern: string;
  isDynamic?: boolean;
  scripts: string[];
  css: string[];
}

interface RouteManifest {
  prefetch?: "intent" | "viewport" | "none";
  routes: RouteManifestEntry[];
}

interface MatchResult {
  params: Record<string, string>;
}

export function matchPattern(pattern: string, pathname: string): MatchResult | null {
  const pSegs = pattern.split("/").filter(Boolean);
  const uSegs = pathname.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  let i = 0;
  for (; i < pSegs.length; i++) {
    const p = pSegs[i]!;
    if (p.startsWith("*")) {
      params[p.slice(1)] = uSegs.slice(i).join("/");
      return { params };
    }
    if (i >= uSegs.length) return null;
    if (p.startsWith(":")) {
      params[p.slice(1)] = decodeURIComponent(uSegs[i]!);
    } else if (p !== uSegs[i]) {
      return null;
    }
  }
  return i === uSegs.length ? { params } : null;
}

let started = false;
const loadedScripts = new Set<string>();
const prefetchCache = new Map<string, Promise<unknown>>();
const scrollPositions = new Map<string, number>();

function readManifest(): RouteManifest | null {
  const script = document.getElementById("__FROST_ROUTES__");
  if (!script?.textContent) return null;
  try {
    const manifest = JSON.parse(script.textContent) as RouteManifest;
    return manifest?.routes?.length ? manifest : null;
  } catch {
    return null;
  }
}

function ensureCss(hrefs: string[]): void {
  for (const href of hrefs) {
    if (document.querySelector(`link[href="${CSS.escape(href)}"]`)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

async function ensureChunks(entry: RouteManifestEntry): Promise<void> {
  const pending = entry.scripts.filter((src) => !loadedScripts.has(src));
  if (pending.length === 0) return;
  await Promise.all(
    pending.map(async (src) => {
      // @vite-ignore — chunk URLs come from the runtime manifest.
      await import(/* @vite-ignore */ src);
      loadedScripts.add(src);
    }),
  );
}

async function fetchRouteData(url: URL): Promise<{
  routeId: string;
  pathname: string;
  params: Record<string, string>;
  loaderData: unknown;
  layoutData?: unknown[];
}> {
  const dataUrl = new URL(url.pathname + url.search, url.origin);
  dataUrl.searchParams.set("__frost_data", "1");
  const res = await fetch(dataUrl.toString(), {
    headers: { "x-frost-router": "1" },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`data fetch failed: ${res.status}`);
  return res.json();
}

function findRoute(
  manifest: RouteManifest,
  pathname: string,
): { entry: RouteManifestEntry; match: MatchResult } | null {
  // Static routes first, then dynamic, then catch-all — mirrors the
  // server's route scoring.
  const rank = (e: RouteManifestEntry) =>
    e.pattern.includes("*") ? 2 : e.isDynamic || e.pattern.includes(":") ? 1 : 0;
  const sorted = [...manifest.routes].sort((a, b) => rank(a) - rank(b));
  for (const entry of sorted) {
    const match = matchPattern(entry.pattern, pathname);
    if (match) return { entry, match };
  }
  return null;
}

async function navigateTo(
  href: string,
  manifest: RouteManifest,
  options: { push?: boolean } = {},
): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(href, window.location.href);
  } catch {
    return false;
  }
  if (url.origin !== window.location.origin) return false;

  const pathname = url.pathname || "/";
  const search = url.search;

  // Hash-only or same-document changes don't need a data fetch.
  if (pathname === window.location.pathname && search === window.location.search) {
    if (options.push !== false) {
      history.pushState({}, "", url.pathname + url.search + url.hash);
    }
    return true;
  }

  const found = findRoute(manifest, pathname);
  if (!found) return false;

  try {
    await ensureChunks(found.entry);
    const data = await fetchRouteData(url);
    if (!data || data.routeId !== found.entry.id) {
      // Server matched a different route than our manifest — bail to
      // a full navigation for correctness.
      return false;
    }
    ensureCss(found.entry.css);

    const state: FrostClientState = {
      pathname: data.pathname,
      routeId: data.routeId,
      params: data.params ?? found.match.params,
      loaderData: data.loaderData ?? null,
      layoutData: data.layoutData,
    };

    if (options.push !== false) {
      scrollPositions.set(window.location.pathname + window.location.search, window.scrollY);
      history.pushState({}, "", url.pathname + url.search + url.hash);
    }
    (window as unknown as { __FROST_STATE__?: FrostClientState }).__FROST_STATE__ = state;
    window.dispatchEvent(new CustomEvent<FrostClientState>("frost:navigate", { detail: state }));
    requestAnimationFrame(() => {
      const saved = options.push === false ? scrollPositions.get(pathname + search) : undefined;
      window.scrollTo(0, saved ?? 0);
      document.getElementById("__frost")?.focus({ preventScroll: true });
    });
    return true;
  } catch {
    return false;
  }
}

function prefetchRoute(href: string, manifest: RouteManifest): void {
  if (manifest.prefetch === "none") return;
  if (prefetchCache.has(href)) return;
  const promise = (async () => {
    try {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const found = findRoute(manifest, url.pathname || "/");
      if (!found) return;
      await Promise.all([ensureChunks(found.entry), fetchRouteData(url)]);
    } catch {
      // Prefetch is best-effort.
    }
  })();
  prefetchCache.set(href, promise);
}

/** Starts the client router. Idempotent; no-ops without a manifest. */
export function initClientRouter(): void {
  if (started || typeof window === "undefined" || typeof document === "undefined") {
    return;
  }
  const manifest = readManifest();
  if (!manifest) return;
  started = true;

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const anchor = (event.target as Element | null)?.closest?.("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target && anchor.target !== "_self") return;
    if (anchor.hasAttribute("download")) return;
    const rel = anchor.getAttribute("rel") ?? "";
    if (/\bexternal\b/.test(rel)) return;
    const href = anchor.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }
    event.preventDefault();
    void navigateTo(href, manifest).then((ok) => {
      if (!ok) window.location.assign(href);
    });
  });

  window.addEventListener("popstate", () => {
    const href = window.location.pathname + window.location.search;
    void navigateTo(href, manifest, { push: false }).then((ok) => {
      if (!ok) window.location.reload();
    });
  });

  if (manifest.prefetch === "intent") {
    const onIntent = (event: Event) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (anchor instanceof HTMLAnchorElement) {
        const href = anchor.getAttribute("href");
        if (href && !href.startsWith("#")) prefetchRoute(href, manifest);
      }
    };
    document.addEventListener("pointerover", onIntent);
    document.addEventListener("focusin", onIntent);
  } else if (manifest.prefetch === "viewport") {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const anchor = entry.target as HTMLAnchorElement;
        const href = anchor.getAttribute("href");
        if (href && !href.startsWith("#")) prefetchRoute(href, manifest);
        observer.unobserve(anchor);
      }
    });
    document.querySelectorAll("a[href]").forEach((a) => observer.observe(a));
  }
}
