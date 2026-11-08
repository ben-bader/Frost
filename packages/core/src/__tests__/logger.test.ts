import { describe, it, expect, vi, afterEach } from "vitest";
import { createLogger, logRequest } from "../logger.js";

const base = { level: "info" as const, requestLogs: false, format: "pretty" as const };

afterEach(() => vi.restoreAllMocks());

describe("createLogger", () => {
  it("filters below the configured level", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logger = createLogger({ ...base, level: "warn" });
    logger.debug("d");
    logger.info("i");
    expect(logSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    logger.warn("w");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("emits structured JSON lines in json format", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createLogger({ ...base, format: "json" });
    logger.info("hello", { route: "/" });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line.level).toBe("info");
    expect(line.msg).toBe("hello");
    expect(line.route).toBe("/");
    expect(typeof line.time).toBe("string");
  });
});

describe("logRequest", () => {
  it("logs method, path, status, and duration", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createLogger({ ...base, format: "json" });
    logRequest(logger, { method: "GET", path: "/playground", status: 200, ms: 12 });
    const line = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(line.msg).toContain("GET /playground 200");
    expect(line.status).toBe(200);
    expect(line.ms).toBe(12);
  });
});
