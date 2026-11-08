// Cross-platform child_process helper.
// On Windows, pnpm/npm/npx are .cmd shims that cannot be spawned directly
// without a shell — and spawn({shell:true, args}) triggers DEP0190.
// Instead we invoke cmd.exe /d /s /c with a pre-quoted command line and
// shell:false, which is warning-free and works identically on Linux.
import { spawnSync } from "node:child_process";

const IS_WIN = process.platform === "win32";
const SHELL_SHIMS = /^(pnpm|npm|npx|yarn|bun)(\.cmd|\.bat)?$/i;

function quote(arg) {
  const s = String(arg);
  // cmd.exe quoting: wrap in double quotes, escape embedded quotes.
  if (/[\s"]/.test(s)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
}

/**
 * spawnSync wrapper. Returns the SpawnSyncReturns object.
 * opts: { cwd, env, encoding, stdio, input }
 */
export function run(cmd, args = [], opts = {}) {
  const base = {
    cwd: opts.cwd,
    env: opts.env ? { ...process.env, ...opts.env } : process.env,
    encoding: opts.encoding ?? "utf8",
    stdio: opts.stdio ?? "pipe",
    windowsHide: true,
    input: opts.input,
    maxBuffer: opts.maxBuffer ?? 64 * 1024 * 1024,
  };

  if (IS_WIN && SHELL_SHIMS.test(cmd)) {
    const line = [cmd, ...args].map(quote).join(" ");
    return spawnSync("cmd.exe", ["/d", "/s", "/c", line], { ...base, shell: false });
  }
  return spawnSync(cmd, args, { ...base, shell: false });
}

export function runOrFail(cmd, args, label, opts = {}) {
  const res = run(cmd, args, opts);
  if (res.status !== 0) {
    const output = (res.stderr || "") + (res.stdout || "");
    throw new Error(`${label} failed (exit ${res.status}):\n${output.slice(-4000)}`);
  }
  return res;
}
