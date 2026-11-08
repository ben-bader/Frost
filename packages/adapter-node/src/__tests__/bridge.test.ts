import { describe, it, expect } from "vitest";
import {
  isSafeRequestTarget,
  nodeReqToWebRequest,
} from "../bridge.js";
import type { IncomingMessage } from "node:http";

function fakeReq(url: string | undefined, headers: Record<string, string> = {}): IncomingMessage {
  return {
    url,
    method: "GET",
    headers,
    socket: {},
  } as unknown as IncomingMessage;
}

describe("isSafeRequestTarget", () => {
  it("accepts origin-form paths", () => {
    expect(isSafeRequestTarget("/")).toBe(true);
    expect(isSafeRequestTarget("//")).toBe(true);
    expect(isSafeRequestTarget("/playground?x=1")).toBe(true);
    expect(isSafeRequestTarget(undefined)).toBe(true);
  });

  it("accepts absolute http(s) URLs", () => {
    expect(isSafeRequestTarget("http://example.com/a?b=1")).toBe(true);
    expect(isSafeRequestTarget("https://example.com/")).toBe(true);
  });

  it("rejects malformed absolute URLs and non-http schemes", () => {
    expect(isSafeRequestTarget("http://[::1")).toBe(false);
    expect(isSafeRequestTarget("ftp://example.com/x")).toBe(false);
    expect(isSafeRequestTarget("example.com/path")).toBe(false);
  });
});

describe("nodeReqToWebRequest", () => {
  it("treats //path as a path, never a protocol-relative host", async () => {
    const req = nodeReqToWebRequest(fakeReq("//", { host: "localhost:3000" }));
    expect(new URL(req.url).pathname).toBe("/");
  });

  it("collapses ///x to /x", async () => {
    const req = nodeReqToWebRequest(fakeReq("///x", { host: "localhost:3000" }));
    expect(new URL(req.url).pathname).toBe("/x");
  });

  it("treats //evil.example/x as a path on our host", async () => {
    const req = nodeReqToWebRequest(
      fakeReq("//evil.example/x", { host: "localhost:3000" })
    );
    const url = new URL(req.url);
    expect(url.host).toBe("localhost:3000");
    expect(url.pathname).toBe("/evil.example/x");
  });

  it("reduces absolute-form URLs to path+query", async () => {
    const req = nodeReqToWebRequest(
      fakeReq("http://localhost:3000/playground?x=1", { host: "localhost:3000" })
    );
    const url = new URL(req.url);
    expect(url.pathname).toBe("/playground");
    expect(url.search).toBe("?x=1");
  });

  it("falls back safely for authority-form and junk targets", async () => {
    const req = nodeReqToWebRequest(fakeReq("example.com:443", { host: "localhost:3000" }));
    expect(new URL(req.url).pathname).toBe("/");
  });

  it("sanitizes a hostile Host header", async () => {
    const req = nodeReqToWebRequest(fakeReq("/", { host: "evil host<script>" }));
    const url = new URL(req.url);
    expect(url.host).not.toContain("<");
  });

  it("never throws on undefined url", async () => {
    const req = nodeReqToWebRequest(fakeReq(undefined));
    expect(new URL(req.url).pathname).toBe("/");
  });
});
