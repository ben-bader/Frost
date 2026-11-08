import { startTransition, useEffect, useState, type ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { FrostProvider, isFrostClientState, type FrostClientState } from "./context.js";
import { FrostErrorBoundary } from "./error-boundary.js";
import {
  getRouteComponents,
  registerRouteComponents,
  type RouteComponent,
} from "./route-registry.js";
import { initClientRouter } from "./router.js";

declare global {
  interface Window {
    __FROST_DATA__?: any;
    __FROST_STATE__?: FrostClientState;
    __FROST_HYDRATED__?: boolean;
  }
}

export function getClientState(): FrostClientState {
  if (typeof window === "undefined") {
    return {
      pathname: "/",
      params: {},
      loaderData: null,
    };
  }

  const currentPath = window.location.pathname || "/";

  // 1. Check if parsed state was already cached on window and still belongs to the current route.
  if (
    isFrostClientState(window.__FROST_STATE__) &&
    window.__FROST_STATE__.pathname === currentPath
  ) {
    return window.__FROST_STATE__;
  }
  if (isFrostClientState(window.__FROST_DATA__) && window.__FROST_DATA__.pathname === currentPath) {
    return window.__FROST_DATA__;
  }

  // 2. Parse from the embedded JSON script element.
  // Note: avoid named property collisions on window where window.__FROST_DATA__ is the HTMLScriptElement itself.
  const script = document.getElementById("__FROST_DATA__");
  if (script && script.textContent) {
    try {
      const parsed = JSON.parse(script.textContent) as FrostClientState;
      if (parsed && parsed.pathname === currentPath) {
        window.__FROST_STATE__ = parsed;
        try {
          window.__FROST_DATA__ = parsed;
        } catch {
          // window.__FROST_DATA__ may be read-only if DOM property is non-configurable.
        }
        return parsed;
      }
    } catch (err) {
      console.error("[Frost] Failed to parse hydration data from #__FROST_DATA__ script:", err);
    }
  }

  // 3. Fallback when running without SSR payload or stale request state.
  const fallbackState: FrostClientState = {
    pathname: currentPath,
    params: {},
    loaderData: null,
  };
  window.__FROST_STATE__ = fallbackState;
  return fallbackState;
}

export type { RouteComponent };

interface HydratedAppProps {
  Component: RouteComponent;
  layouts: RouteComponent[];
  state: FrostClientState;
}

function HydratedApp({ Component, layouts, state }: HydratedAppProps) {
  const [routeState, setRouteState] = useState<FrostClientState>(state);
  const [actionData, setActionData] = useState<unknown>(state.actionData);

  // Client-router navigations swap route state without a document load.
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const detail = (event as CustomEvent<FrostClientState>).detail;
      if (!detail) return;
      startTransition(() => {
        setRouteState(detail);
        setActionData(detail.actionData);
      });
    };
    window.addEventListener("frost:navigate", onNavigate);
    return () => window.removeEventListener("frost:navigate", onNavigate);
  }, []);

  // Resolve the component tree for the current route: the registry holds
  // components for lazily-loaded routes; fall back to the hydrated entry.
  const entry = routeState.routeId ? getRouteComponents()[routeState.routeId] : undefined;
  const RouteComp = entry?.default ?? Component;
  const layoutList = entry?.layouts ?? layouts;
  const current = routeState;

  // Progressive enhancement: intercept same-document <form method="post">
  // submissions and upgrade them to fetch. The server returns JSON action
  // data for non-HTML clients; we feed it back into React state so the
  // page re-renders without a full document load. Any failure falls back
  // to native form submission/navigation.
  useEffect(() => {
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.hasAttribute("data-no-enhance")) return;
      const method = (form.getAttribute("method") ?? "get").toLowerCase();
      if (method !== "post") return;

      // Only enhance forms that post back to the current document.
      const actionAttr = form.getAttribute("action");
      let target = window.location.pathname + window.location.search;
      if (actionAttr) {
        try {
          const url = new URL(actionAttr, window.location.href);
          if (url.origin !== window.location.origin || url.pathname !== window.location.pathname) {
            return;
          }
          target = url.pathname + url.search;
        } catch {
          return;
        }
      }

      event.preventDefault();
      fetch(target, {
        method: "POST",
        body: new FormData(form),
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      })
        .then(async (res) => {
          const contentType = res.headers.get("content-type") ?? "";
          if (contentType.includes("json")) {
            setActionData(await res.json());
          } else {
            // Redirect or non-JSON response: navigate the document.
            window.location.assign(res.url || target);
          }
        })
        .catch(() => {
          // Network failure: submit natively (bypasses this listener).
          form.submit();
        });
    };
    document.addEventListener("submit", onSubmit);
    return () => document.removeEventListener("submit", onSubmit);
  }, []);

  // Build component tree from page up through layout hierarchy to match SSR structure
  let appTree: ReactNode = (
    <RouteComp data={current.loaderData} actionData={actionData} params={current.params} />
  );

  if (Array.isArray(layoutList) && layoutList.length > 0) {
    for (let i = layoutList.length - 1; i >= 0; i--) {
      const LayoutComp = layoutList[i];
      if (LayoutComp) {
        // Each layout receives its own loader data (serialized as
        // state.layoutData); fall back to route data for older payloads.
        const layoutData =
          current.layoutData && i < current.layoutData.length
            ? current.layoutData[i]
            : current.loaderData;
        appTree = (
          <LayoutComp data={layoutData} actionData={actionData} params={current.params}>
            {appTree}
          </LayoutComp>
        );
      }
    }
  }

  return (
    <FrostProvider value={current}>
      <FrostErrorBoundary>{appTree}</FrostErrorBoundary>
    </FrostProvider>
  );
}

export function hydrateApp(
  Component: RouteComponent,
  layouts: RouteComponent[] = [],
  routeId?: string,
): void {
  const state = getClientState();
  const rootElement = document.getElementById("__frost");

  // Register this route's components so the client router can swap to
  // them later. Runs for every route chunk, hydrated or not. The
  // explicit routeId matters: lazily-imported chunks run before the
  // navigation commits, so window state still points at the old route.
  registerRouteComponents(routeId ?? state.routeId ?? state.pathname, Component, layouts);

  if (!rootElement) {
    console.error("[Frost] Could not find #__frost root element for hydration.");
    return;
  }

  // Route chunks loaded by the client router also call hydrateApp — only
  // the first entry performs hydration.
  if (window.__FROST_HYDRATED__) return;
  window.__FROST_HYDRATED__ = true;

  hydrateRoot(rootElement, <HydratedApp Component={Component} layouts={layouts} state={state} />);

  // Opt-in client router: no-ops unless the document carries a
  // __FROST_ROUTES__ manifest (config.router.enabled).
  initClientRouter();
}
