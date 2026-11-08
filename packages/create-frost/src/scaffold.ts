import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type TemplateName = "minimal" | "tailwind";

export const TEMPLATES: readonly TemplateName[] = ["minimal", "tailwind"];

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function templatesDir(): string {
  // dist/ -> package root
  return path.resolve(__dirname, "..", "templates");
}

function copyDir(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export interface ScaffoldOptions {
  targetDir: string;
  template?: TemplateName;
  appName?: string;
}

export interface ScaffoldResult {
  template: TemplateName;
  files: string[];
  targetDir: string;
}

/**
 * Scaffold a new Frost app into `targetDir`. The directory must be
 * empty or non-existent. Returns the list of written files (relative).
 */
export function scaffold(options: ScaffoldOptions): ScaffoldResult {
  const template = options.template ?? "minimal";
  if (!TEMPLATES.includes(template)) {
    throw new Error(
      `Unknown template "${template}". Available: ${TEMPLATES.join(", ")}`
    );
  }
  const target = path.resolve(options.targetDir);
  if (fs.existsSync(target)) {
    const entries = fs.readdirSync(target);
    if (entries.length > 0) {
      throw new Error(`Target directory ${target} is not empty.`);
    }
  }
  const src = path.join(templatesDir(), template);
  if (!fs.existsSync(src)) {
    throw new Error(`Template "${template}" not found at ${src}`);
  }
  copyDir(src, target);

  // Normalize package.json name when an app name was provided.
  const pkgPath = path.join(target, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    name: string;
  };
  if (options.appName) {
    pkg.name = options.appName;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  const files: string[] = [];
  const walk = (dir: string, prefix = ""): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(dir, entry.name), rel);
      else files.push(rel);
    }
  };
  walk(target);
  return { template, files: files.sort(), targetDir: target };
}
