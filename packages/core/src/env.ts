/**
 * Minimal .env file loading — no dependency. Supports the subset of the
 * dotenv format Frost needs: KEY=value lines, optional `export ` prefix,
 * single/double quotes, `#` comments, and blank lines. Existing
 * process.env values always win (files never override the real env).
 */

export interface EnvFilesResult {
  /** Variables loaded from files (does not include pre-existing env). */
  loaded: Record<string, string>;
  /** Files that were found and parsed, in load order. */
  files: string[];
}

const FILE_NAMES = (mode: string): string[] => [
  ".env",
  ".env.local",
  `.env.${mode}`,
  `.env.${mode}.local`,
];

function parseEnvFile(content: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const withoutExport = line.startsWith("export ") ? line.slice(7).trimStart() : line;
    const eq = withoutExport.indexOf("=");
    if (eq === -1) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = withoutExport.slice(eq + 1).trim();
    const quote = value[0];
    if (quote === '"' || quote === "'") {
      // Quoted value: take up to the matching close quote; anything after
      // it (including comments) is ignored.
      const close = value.indexOf(quote, 1);
      value = close === -1 ? value.slice(1) : value.slice(1, close);
    } else {
      // Unquoted: strip inline comments.
      const hash = value.indexOf(" #");
      if (hash !== -1) value = value.slice(0, hash).trimEnd();
    }
    out[key] = value;
  }
  return out;
}

/**
 * Loads .env, .env.local, .env.[mode], .env.[mode].local from `rootDir`
 * into process.env (without overriding existing variables) and returns
 * what was loaded. Later files win over earlier ones.
 */
export async function loadEnvFiles(
  rootDir: string,
  mode: string
): Promise<EnvFilesResult> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  const loaded: Record<string, string> = {};
  const files: string[] = [];
  // Variables present before loading always win — files may refine each
  // other's values (later files override earlier ones) but never the
  // real environment.
  const realEnv = new Set(Object.keys(process.env));

  for (const name of FILE_NAMES(mode)) {
    const file = path.join(rootDir, name);
    try {
      const content = await fs.readFile(file, "utf-8");
      const parsed = parseEnvFile(content);
      for (const [k, v] of Object.entries(parsed)) {
        if (!realEnv.has(k)) {
          process.env[k] = v;
        }
        loaded[k] = process.env[k]!;
      }
      files.push(file);
    } catch {
      // File absent or unreadable — skip.
    }
  }
  return { loaded, files };
}

/**
 * Validates required environment variables. Returns the list of missing
 * names (empty = OK) without throwing, so callers control the error UX.
 */
export function missingEnvVars(required: string[]): string[] {
  return required.filter((name) => {
    const v = process.env[name];
    return v === undefined || v === "";
  });
}
