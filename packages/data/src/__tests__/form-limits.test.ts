import { describe, it, expect } from "vitest";
import { parseFormData, parseJson, setBodyLimits, getBodyLimits } from "../form.js";
import { FrostError } from "@frost.js/core";

function formRequest(body: string, contentLength?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
  if (contentLength !== undefined) headers["Content-Length"] = contentLength;
  return new Request("http://localhost/", { method: "POST", headers, body });
}

describe("Body size limits", () => {
  it("parseFormData enforces a cumulative byte limit without content-length", async () => {
    const big = "a=" + "x".repeat(2 * 1024 * 1024);
    const req = formRequest(big); // no content-length header
    await expect(parseFormData(req, { maxSizeBytes: 1024 })).rejects.toMatchObject({
      code: "FS1011",
      status: 413,
    });
  });

  it("parseFormData rejects early on a large content-length", async () => {
    const req = formRequest("a=1", String(5 * 1024 * 1024));
    await expect(parseFormData(req, { maxSizeBytes: 1024 })).rejects.toBeInstanceOf(FrostError);
  });

  it("parseFormData parses bodies under the limit", async () => {
    const req = formRequest("name=frost&tag=a&tag=b");
    const data = await parseFormData(req, { maxSizeBytes: 1024 * 1024 });
    expect(data.name).toBe("frost");
    expect(data.tag).toEqual(["a", "b"]);
  });

  it("parseJson enforces the limit while streaming", async () => {
    const big = JSON.stringify({ blob: "x".repeat(2 * 1024 * 1024) });
    const req = new Request("http://localhost/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: big,
    });
    await expect(parseJson(req, { maxSizeBytes: 1024 })).rejects.toMatchObject({
      code: "FS1011",
      status: 413,
    });
  });

  it("setBodyLimits configures defaults used by parsers", async () => {
    setBodyLimits({ formBytes: 64, jsonBytes: 128 });
    expect(getBodyLimits()).toEqual({ formBytes: 64, jsonBytes: 128 });
    const req = formRequest("a=" + "x".repeat(200));
    await expect(parseFormData(req)).rejects.toMatchObject({ status: 413 });
    setBodyLimits({ formBytes: 1024 * 1024, jsonBytes: 1024 * 1024 });
  });
});
