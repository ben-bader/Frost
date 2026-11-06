import type { ComponentType } from "react";
import { hydrateRoot } from "react-dom/client";
import { FrostProvider, type FrostClientState } from "./context.js";

declare global {
  interface Window {
    __FROST_DATA__?: FrostClientState;
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

  if (window.__FROST_DATA__) {
    return window.__FROST_DATA__;
  }

  const script = document.getElementById("__FROST_DATA__");
  if (script && script.textContent) {
    try {
      const parsed = JSON.parse(script.textContent) as FrostClientState;
      window.__FROST_DATA__ = parsed;
      return parsed;
    } catch (err) {
      console.error("[Frost] Failed to parse hydration data:", err);
    }
  }

  return {
    pathname: window.location.pathname,
    params: {},
    loaderData: null,
  };
}

export function hydrateApp(Component: ComponentType<{ data: unknown; params: Record<string, string> }>): void {
  const state = getClientState();
  const rootElement = document.getElementById("__frost");

  if (!rootElement) {
    console.error("[Frost] Could not find #__frost root element for hydration.");
    return;
  }

  hydrateRoot(
    rootElement,
    <FrostProvider value={state}>
      <Component data={state.loaderData} params={state.params} />
    </FrostProvider>
  );
}
