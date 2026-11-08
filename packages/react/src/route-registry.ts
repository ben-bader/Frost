import type { ComponentType, ReactNode } from "react";

export type RouteComponent = ComponentType<{
  data: unknown;
  params: Record<string, string>;
  children?: ReactNode;
  actionData?: unknown;
}>;

export interface RouteComponentsEntry {
  default: RouteComponent;
  layouts: RouteComponent[];
}

const REGISTRY_KEY = "__FROST_ROUTE_COMPONENTS__";

/** Registry of lazily-loaded route components for the client router. */
export function getRouteComponents(): Record<string, RouteComponentsEntry> {
  const g = globalThis as Record<string, unknown>;
  if (typeof g[REGISTRY_KEY] !== "object" || g[REGISTRY_KEY] === null) {
    g[REGISTRY_KEY] = {};
  }
  return g[REGISTRY_KEY] as Record<string, RouteComponentsEntry>;
}

export function registerRouteComponents(
  routeId: string,
  component: RouteComponentsEntry["default"],
  layouts: RouteComponentsEntry["layouts"] = []
): void {
  getRouteComponents()[routeId] = { default: component, layouts };
}
