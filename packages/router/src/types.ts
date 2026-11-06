export type RouteKind = "page" | "layout" | "api";

export interface DiscoveredRoute {
  id: string;
  pattern: string;
  filePath: string;
  kind: RouteKind;
  isDynamic: boolean;
  isCatchAll: boolean;
  score: number;
}

export interface RouteMatch<TRoute = DiscoveredRoute> {
  route: TRoute;
  params: Record<string, string>;
  pathname: string;
}
