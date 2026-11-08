// Removes compiled test files from a package's dist/ so published
// tarballs never ship tests. Run from the package directory.
import fs from "node:fs";
import path from "node:path";

const dist = path.resolve("dist");
if (!fs.existsSync(dist)) process.exit(0);

let removed = 0;
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") {
        fs.rmSync(full, { recursive: true, force: true });
        removed++;
      } else walk(full);
    } else if (/\.test\.(js|mjs|cjs|d\.ts)$/.test(entry.name)) {
      fs.rmSync(full, { force: true });
      removed++;
    }
  }
};
walk(dist);
if (removed) console.log(`strip-dist-tests: removed ${removed} test artifact(s)`);
