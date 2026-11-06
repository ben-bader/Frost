import { normalizePathname } from "./normalize.js";
import type { RouteMatch } from "./types.js";

export interface CompiledRoute<T> {
  route: T;
  pattern: string;
  regex: RegExp;
  paramNames: string[];
}

export function compilePattern<T>(route: T, pattern: string): CompiledRoute<T> {
  const normalized = normalizePathname(pattern);
  const paramNames: string[] = [];

  if (normalized === "/") {
    return {
      route,
      pattern: "/",
      regex: /^\/$/,
      paramNames: [],
    };
  }

  const segments = normalized.split("/").filter(Boolean);
  const regexParts = segments.map((segment) => {
    if (segment.startsWith("*")) {
      const name = segment.slice(1);
      paramNames.push(name);
      return "(.*)";
    }
    if (segment.startsWith(":")) {
      const name = segment.slice(1);
      paramNames.push(name);
      return "([^/]+)";
    }
    // Escape special regex characters
    return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  });

  const regex = new RegExp(`^/${regexParts.join("/")}$`);
  return {
    route,
    pattern: normalized,
    regex,
    paramNames,
  };
}

export function matchRoutes<T>(
  compiledRoutes: CompiledRoute<T>[],
  pathname: string
): RouteMatch<T> | null {
  const normalized = normalizePathname(pathname);

  for (const compiled of compiledRoutes) {
    const match = normalized.match(compiled.regex);
    if (match) {
      const params: Record<string, string> = {};
      const values = match.slice(1);

      compiled.paramNames.forEach((name, idx) => {
        const val = values[idx];
        if (val !== undefined) {
          try {
            params[name] = decodeURIComponent(val);
          } catch {
            params[name] = val;
          }
        }
      });

      return {
        route: compiled.route,
        params,
        pathname: normalized,
      };
    }
  }

  return null;
}
