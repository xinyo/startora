import { describe, expect, it } from "vitest";
import {
  parseOptionalBoolean,
  parseOptionalOrigin,
  parseTrustProxy,
} from "../../src/server/config.js";

describe("server configuration", () => {
  it("normalizes optional origins", () => {
    expect(parseOptionalOrigin(undefined)).toBeUndefined();
    expect(parseOptionalOrigin("  ")).toBeUndefined();
    expect(parseOptionalOrigin("https://startora.example/path")).toBe(
      "https://startora.example",
    );
  });

  it("parses optional boolean values strictly", () => {
    expect(parseOptionalBoolean(undefined, "COOKIE_SECURE")).toBeUndefined();
    expect(parseOptionalBoolean("true", "COOKIE_SECURE")).toBe(true);
    expect(parseOptionalBoolean(" FALSE ", "COOKIE_SECURE")).toBe(false);
    expect(() => parseOptionalBoolean("yes", "COOKIE_SECURE")).toThrow(
      'COOKIE_SECURE must be either "true" or "false".',
    );
  });

  it("parses Express proxy trust settings", () => {
    expect(parseTrustProxy(undefined)).toBeUndefined();
    expect(parseTrustProxy("true")).toBe(true);
    expect(parseTrustProxy("false")).toBe(false);
    expect(parseTrustProxy("1")).toBe(1);
    expect(parseTrustProxy("loopback, uniquelocal")).toBe(
      "loopback, uniquelocal",
    );
  });
});
