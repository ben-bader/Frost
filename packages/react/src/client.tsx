import type { ComponentType, ReactNode } from "react";
import { hydrateRoot } from "react-dom/client";
import { FrostProvider, isFrostClientState, type FrostClientState } from "./context.js";
import { FrostErrorBoundary } from "./error-boundary.js";

declare global {
  interface Window {
    __FROST_DATA__?: any;
    __FROST_STATE__?: FrostClientState;
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
  if (isFrostClientState(window.__FROST_STATE__) && window.__FROST_STATE__.pathname === currentPath) {
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

export type RouteComponent = ComponentType<{
  data: unknown;
  params: Record<string, string>;
  children?: ReactNode;
  actionData?: unknown;
}>;

export function hydrateApp(
  Component: RouteComponent,
  layouts: RouteComponent[] = []
): void {
  const state = getClientState();
  const rootElement = document.getElementById("__frost");

  if (!rootElement) {
    console.error("[Frost] Could not find #__frost root element for hydration.");
    return;
  }

  // Build component tree from page up through layout hierarchy to match SSR structure
  let appTree: ReactNode = (
    <Component data={state.loaderData} actionData={state.actionData} params={state.params} />
  );

  if (Array.isArray(layouts) && layouts.length > 0) {
    for (let i = layouts.length - 1; i >= 0; i--) {
      const LayoutComp = layouts[i];
      if (LayoutComp) {
        // Each layout receives its own loader data (serialized as
        // state.layoutData); fall back to route data for older payloads.
        const layoutData =
          state.layoutData && i < state.layoutData.length
            ? state.layoutData[i]
            : state.loaderData;
        appTree = (
          <LayoutComp data={layoutData} actionData={state.actionData} params={state.params}>
            {appTree}
          </LayoutComp>
        );
      }
    }
  }

  hydrateRoot(
    rootElement,
    <FrostProvider value={state}>
      <FrostErrorBoundary>{appTree}</FrostErrorBoundary>
    </FrostProvider>
  );
}
