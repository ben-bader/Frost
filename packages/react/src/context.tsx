import { createContext, useContext, type ReactNode } from "react";

export interface FrostClientState {
  pathname: string;
  params: Record<string, string>;
  loaderData: unknown;
  error?: { message: string; stack?: string };
  assets?: {
    scripts: string[];
    css: string[];
  };
}

const FROST_CONTEXT_KEY = Symbol.for("__FROST_APP_CONTEXT__");

const FrostContext: React.Context<FrostClientState | null> =
  ((globalThis as any)[FROST_CONTEXT_KEY] ||= createContext<FrostClientState | null>(null));

export interface FrostProviderProps {
  value: FrostClientState;
  children: ReactNode;
}

export function FrostProvider({ value, children }: FrostProviderProps): React.JSX.Element {
  return <FrostContext.Provider value={value}>{children}</FrostContext.Provider>;
}

export function useFrostContext(): FrostClientState {
  const ctx = useContext(FrostContext);
  if (ctx) {
    return ctx;
  }

  // Graceful fallback for client-side or nested rendering
  if (typeof window !== "undefined" && (window as any).__FROST_DATA__) {
    return (window as any).__FROST_DATA__;
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
  if (typeof window !== "undefined" && window.location.pathname) {
    return window.location.pathname;
  }
  const ctx = useFrostContext();
  return ctx.pathname || "/";
}
