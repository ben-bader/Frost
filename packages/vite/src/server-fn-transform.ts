/**
 * Rewrites createServerFn({ name: "id", handler }) calls in CLIENT
 * bundles to fetch stubs, so server handler code never ships to the
 * browser. Server builds (ssr) are untouched.
 *
 * Only direct calls whose config object has a literal `name: "..."`
 * are rewritten; anything else is left alone (and will fail loudly at
 * runtime if invoked in the browser).
 */

const IMPORT_RE = /import\s*\{[^}]*\bcreateServerFn\b[^}]*\}\s*from\s*["']@frostjs\/data["']/;
const NAME_RE = /\bname\s*:\s*(["'`])([^"'`]+)\1/;

/** Finds the index of the paren matching the '(' at `open`. */
function matchParen(code: string, open: number): number {
  let depth = 0;
  let i = open;
  let state: "code" | "sq" | "dq" | "tpl" = "code";
  const tplStack: number[] = []; // brace depth at each template entry
  while (i < code.length) {
    const c = code[i]!;
    const n = code[i + 1];
    if (state === "sq") {
      if (c === "\\") i++;
      else if (c === "'") state = "code";
    } else if (state === "dq") {
      if (c === "\\") i++;
      else if (c === '"') state = "code";
    } else if (state === "tpl") {
      if (c === "\\") i++;
      else if (c === "`") state = "code";
      else if (c === "$" && n === "{") {
        tplStack.push(depth);
        state = "code";
        i++;
      }
    } else {
      // code state (also inside ${} of templates)
      if (c === "'") state = "sq";
      else if (c === '"') state = "dq";
      else if (c === "`") state = "tpl";
      else if (c === "{") depth++;
      else if (c === "}") {
        if (tplStack.length && depth === tplStack[tplStack.length - 1]) {
          tplStack.pop();
          state = "tpl";
        } else depth--;
      } else if (c === "(") depth++;
      else if (c === ")") {
        depth--;
        if (depth === 0) return i;
      }
    }
    i++;
  }
  return -1;
}

export function transformServerFnCalls(code: string): string | null {
  if (!code.includes("createServerFn(")) return null;
  if (!IMPORT_RE.test(code)) return null;

  let out = "";
  let cursor = 0;
  let changed = false;

  while (cursor < code.length) {
    const idx = code.indexOf("createServerFn(", cursor);
    if (idx === -1) break;
    const open = idx + "createServerFn".length;
    const close = matchParen(code, open);
    if (close === -1) break;
    const argsText = code.slice(open + 1, close);
    const nameMatch = NAME_RE.exec(argsText);
    if (!nameMatch) {
      cursor = close + 1;
      continue;
    }
    out += code.slice(cursor, idx);
    out += `__frostServerFnFetch(${JSON.stringify(nameMatch[2])})`;
    cursor = close + 1;
    changed = true;
  }

  if (!changed) return null;
  out += code.slice(cursor);
  return (
    'import { frostServerFnFetch as __frostServerFnFetch } from "virtual:frost/server-fn-client";\n' +
    out
  );
}
