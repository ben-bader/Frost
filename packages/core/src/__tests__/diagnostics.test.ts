import { describe, it, expect } from "vitest";
import {
  createErrorReport,
  formatErrorReportTerminal,
  toPublicError,
  FROST_ERROR_CODES,
} from "../diagnostics.js";

describe("createErrorReport", () => {
  it("extracts name, message, location, and stack", () => {
    const err = new Error("boom");
    err.stack = "Error: boom\n    at foo (D:/proj/src/app/page.tsx:12:34)\n    at bar";
    const report = createErrorReport(err, {
      runtime: "server",
      route: "/x",
      code: FROST_ERROR_CODES.LOADER,
    });
    expect(report.name).toBe("Error");
    expect(report.message).toBe("boom");
    expect(report.code).toBe("FROST_E_LOADER");
    expect(report.location).toContain("page.tsx:12:34");
    expect(report.route).toBe("/x");
    expect(report.runtime).toBe("server");
    expect(report.severity).toBe("error");
    expect(report.timestamp).toBeTruthy();
  });

  it("prefers a FROST_E_* code set on the error over the caller's category", () => {
    const err = Object.assign(new Error("contract"), {
      code: "FROST_E_CONTRACT",
    });
    const report = createErrorReport(err, {
      runtime: "server",
      code: FROST_ERROR_CODES.LOADER,
    });
    expect(report.code).toBe("FROST_E_CONTRACT");
  });

  it("uses the caller's category code instead of third-party codes", () => {
    const err = Object.assign(new Error("failed"), { code: "ERR_LOAD_URL" });
    const report = createErrorReport(err, {
      runtime: "server",
      code: FROST_ERROR_CODES.RENDER,
    });
    expect(report.code).toBe("FROST_E_RENDER");
  });

  it("wraps non-Error values", () => {
    const report = createErrorReport("string failure", { runtime: "client" });
    expect(report.message).toBe("string failure");
    expect(report.runtime).toBe("client");
  });
});

describe("formatErrorReportTerminal", () => {
  it("renders an ERROR badge and fields", () => {
    const report = createErrorReport(new Error("nope"), {
      runtime: "server",
      code: FROST_ERROR_CODES.API,
      hint: "check the handler",
    });
    const out = formatErrorReportTerminal(report);
    expect(out).toContain("ERROR");
    expect(out).toContain("Error");
    expect(out).toContain("nope");
    expect(out).toContain("FROST_E_API");
    // The cli-ui block intentionally omits the hint row (spec: only
    // code/at/route/runtime rows are printed).
    expect(out).not.toContain("check the handler");
  });

  it("renders a WARN badge for warnings", () => {
    const report = createErrorReport(new Error("nondeterministic"), {
      runtime: "server",
      severity: "warning",
    });
    expect(formatErrorReportTerminal(report)).toContain("WARN");
  });
});

describe("toPublicError", () => {
  it("strips stack and frame for production", () => {
    const err = new Error("secret internals");
    err.stack = "Error: secret internals\n at secretFile";
    const report = createErrorReport(err, { runtime: "server" });
    const pub = toPublicError(report);
    expect(pub.stack).toBeUndefined();
    expect(pub.frame).toBeUndefined();
    expect(pub.message).toBe("secret internals");
    expect(pub.runtime).toBe("server");
  });
});
