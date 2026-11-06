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

const FrostContext = createContext<FrostClientState | null>(null);

export interface FrostProviderProps {
  value: FrostClientState;
  children: ReactNode;
}

export function FrostProvider({ value, children }: FrostProviderProps): React.JSX.Element {
  return <FrostContext.Provider value={value}>{children}</FrostContext.Provider>;
}

export function useFrostContext(): FrostClientState {
  const ctx = useContext(FrostContext);
  if (!ctx) {
    throw new Error(
      "Frost hooks must be used within a <FrostProvider>. Ensure your component is rendered inside a Frost route."
    );
  }
  return ctx;
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
  const ctx = useFrostContext();
  return ctx.pathname;
}
