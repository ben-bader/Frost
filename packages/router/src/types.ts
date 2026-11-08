export type RouteKind = "page" | "layout" | "api" | "not-found" | "middleware";

export interface DiscoveredRoute {
  id: string;
  pattern: string;
  filePath: string;
  kind: RouteKind;
  isDynamic: boolean;
  isCatchAll: boolean;
  score: number;
  layouts?: string[];
  /**
   * Nearest error-boundary module (error.tsx / _error.tsx) applying to
   * this route, found by walking up from the route's directory.
   */
  errorBoundary?: string;
}

export interface RouteMatch<TRoute = DiscoveredRoute> {
  route: TRoute;
  params: Record<string, string>;
  pathname: string;
}
