import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as http from "node:http";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as zlib from "node:zlib";
import { createNodeServer } from "../server.js";
import {
  compressBuffer,
  decompressBuffer,
  negotiateEncoding,
  isCompressible,
  toCompressionOptions,
} from "../compression.js";

const OPTS = toCompressionOptions({ enabled: true, brotli: true, gzip: true, threshold: 100 });

describe("compression helpers", () => {
  it("negotiates br over gzip when both accepted", () => {
    expect(negotiateEncoding("gzip, deflate, br", OPTS)).toBe("br");
  });

  it("negotiates gzip when br absent or q=0", () => {
    expect(negotiateEncoding("gzip, deflate", OPTS)).toBe("gzip");
    expect(negotiateEncoding("br;q=0, gzip;q=0.5", OPTS)).toBe("gzip");
  });

  it("returns null when nothing usable is accepted", () => {
    expect(negotiateEncoding("identity", OPTS)).toBeNull();
    expect(negotiateEncoding(undefined, OPTS)).toBeNull();
    expect(negotiateEncoding("gzip", toCompressionOptions({ enabled: false }))).toBeNull();
  });

  it("round-trips brotli and gzip buffers", () => {
    const data = Buffer.from("x".repeat(5000));
    for (const enc of ["br", "gzip"] as const) {
      const packed = compressBuffer(data, enc);
      expect(packed.byteLength).toBeLessThan(data.byteLength);
      expect(decompressBuffer(packed, enc).equals(data)).toBe(true);
    }
  });

  it("classifies compressible content types", () => {
    expect(isCompressible("text/html; charset=utf-8")).toBe(true);
    expect(isCompressible("application/json")).toBe(true);
    expect(isCompressible("image/png")).toBe(false);
    expect(isCompressible("application/octet-stream")).toBe(false);
  });
});

describe("compressed responses", () => {
  let server: http.Server;
  let base: string;
  let staticDir: string;

  const bigHtml = "<!doctype html><html><body>" + "lorem ipsum ".repeat(500) + "</body></html>";

  beforeAll(async () => {
    staticDir = fs.mkdtempSync(path.join(os.tmpdir(), "frost-static-comp-"));
    fs.writeFileSync(path.join(staticDir, "big.txt"), "static ".repeat(1000));
    fs.writeFileSync(path.join(staticDir, "big.txt.gz"), zlib.gzipSync("static ".repeat(1000)));

    server = createNodeServer({
      port: 0,
      host: "127.0.0.1",
      staticDirs: [staticDir],
      compression: { enabled: true, brotli: true, gzip: true, threshold: 100 },
      handleRequest: async (req) => {
        const url = new URL(req.url);
        if (url.pathname === "/page") {
          return new Response(bigHtml, { headers: { "Content-Type": "text/html" } });
        }
        if (url.pathname === "/small") {
          return new Response("hi", { headers: { "Content-Type": "text/html" } });
        }
        return new Response("nf", { status: 404 });
      },
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    base = `http://127.0.0.1:${(server.address() as any).port}`;
  });

  afterAll(() => {
    server.close();
    fs.rmSync(staticDir, { recursive: true, force: true });
  });

  it("serves gzip-encoded HTML when accepted and decodes correctly", async () => {
    const res = await fetch(`${base}/page`, { headers: { "Accept-Encoding": "gzip" } });
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("vary")).toContain("Accept-Encoding");
    const text = await res.text(); // fetch transparently decodes
    expect(text).toBe(bigHtml);
  });

  it("serves br when offered", async () => {
    const res = await fetch(`${base}/page`, { headers: { "Accept-Encoding": "br, gzip" } });
    expect(res.headers.get("content-encoding")).toBe("br");
    expect(await res.text()).toBe(bigHtml);
  });

  it("skips compression for tiny bodies", async () => {
    const res = await fetch(`${base}/small`, { headers: { "Accept-Encoding": "gzip" } });
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe("hi");
  });

  it("serves pre-compressed static assets", async () => {
    const res = await fetch(`${base}/big.txt`, { headers: { "Accept-Encoding": "gzip" } });
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("etag")).toContain("-gzip");
    expect(await res.text()).toBe("static ".repeat(1000));
  });

  it("compresses static files on the fly when no precompressed variant exists", async () => {
    fs.writeFileSync(path.join(staticDir, "plain.txt"), "data ".repeat(500));
    const res = await fetch(`${base}/plain.txt`, { headers: { "Accept-Encoding": "br" } });
    expect(res.headers.get("content-encoding")).toBe("br");
    expect(await res.text()).toBe("data ".repeat(500));
  });

  it("static ETag differs per encoding", async () => {
    const res1 = await fetch(`${base}/big.txt`, { headers: { "Accept-Encoding": "gzip" } });
    const etagGz = res1.headers.get("etag");
    await res1.text();
    const res2 = await fetch(`${base}/big.txt`, { headers: { "Accept-Encoding": "br" } });
    const etagBr = res2.headers.get("etag");
    await res2.text();
    expect(etagGz).not.toBe(etagBr);
    expect(etagGz).toContain("-gzip");
    expect(etagBr).toContain("-br");
  });

  it("static ETag 304 works per encoding", async () => {
    const r1 = await fetch(`${base}/big.txt`, { headers: { "Accept-Encoding": "gzip" } });
    const etag = r1.headers.get("etag");
    await r1.text();
    const r2 = await fetch(`${base}/big.txt`, {
      headers: { "Accept-Encoding": "gzip", "If-None-Match": etag! },
    });
    expect(r2.status).toBe(304);
  });
});
