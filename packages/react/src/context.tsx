import { createContext, useContext, type ReactNode } from "react";
import type { FrostAssets } from "@frostjs/core";

export interface FrostClientState {
  pathname: string;
  /** Route id (file path) for client-router component lookup. */
  routeId?: string;
  params: Record<string, string>;
  loaderData: unknown;
  /** Result of the route action when the page re-rendered after a POST. */
  actionData?: unknown;
  /** Per-layout loader results, aligned with the layout chain (root->leaf). */
  layoutData?: unknown[];
  error?: { message: string; stack?: string };
  assets?: FrostAssets;
  /** Per-request CSP nonce echoed into inline script tags. */
  cspNonce?: string;
}

export function isFrostClientState(val: unknown): val is FrostClientState {
  return (
    typeof val === "object" &&
    val !== null &&
    !("nodeType" in val) &&
    typeof (val as any).pathname === "string" &&
    "loaderData" in val
  );
}

const FROST_CONTEXT_KEY = Symbol.for("__FROST_APP_CONTEXT__");

const FrostContext: React.Context<FrostClientState | null> = ((globalThis as any)[
  FROST_CONTEXT_KEY
] ||= createContext<FrostClientState | null>(null));

export interface FrostProviderProps {
  value: FrostClientState;
  children: ReactNode;
}

function getFreshWindowState(): FrostClientState | null {
  if (typeof window === "undefined") {
    return null;
  }

  const currentPath = window.location.pathname || "/";

  const candidateState = (window as any).__FROST_STATE__;
  if (isFrostClientState(candidateState) && candidateState.pathname === currentPath) {
    return candidateState;
  }

  const candidateData = (window as any).__FROST_DATA__;
  if (isFrostClientState(candidateData) && candidateData.pathname === currentPath) {
    return candidateData;
  }

  return null;
}

export function FrostProvider({ value, children }: FrostProviderProps): React.JSX.Element {
  return <FrostContext.Provider value={value}>{children}</FrostContext.Provider>;
}

export function useFrostContext(): FrostClientState {
  const ctx = useContext(FrostContext);
  if (ctx) {
    return ctx;
  }

  // Graceful fallback for client-side or nested rendering without leaking stale route state across requests.
  const freshWindowState = getFreshWindowState();
  if (freshWindowState) {
    return freshWindowState;
  }

  return {
    pathname: typeof window !== "undefined" ? window.location.pathname : "/",
    params: {},
    loaderData: null,
  };
}

export function useLoaderData<T = unknown>(): T {
  const ctx = useFrostContext();
  return ctx.loaderData as T;
}

export function useRouteParams<T = Record<string, string>>(): T {
  const ctx = useFrostContext();
  return ctx.params as T;
}

export function usePathname(): string {
  // Router context wins (F18): after a client-side navigation the
  // provider holds the current route while window.location still shows
  // the previous document until the next full load.
  const ctx = useFrostContext();
  if (ctx?.pathname) {
    return ctx.pathname;
  }
  if (typeof window !== "undefined" && window.location.pathname) {
    return window.location.pathname;
  }
  return "/";
}
