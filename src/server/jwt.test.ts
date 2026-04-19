import { describe, expect, it } from "vitest";
import { authenticateToken, generateToken } from "./jwt";

function createMockResponse() {
  return {
    statusCode: 200,
    jsonBody: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.jsonBody = body;
      return this;
    },
  };
}

describe("server jwt middleware", () => {
  it("returns 401 for invalid access tokens", () => {
    const req = {
      headers: {
        authorization: "Bearer invalid-token",
      },
    };
    const res = createMockResponse();
    const next = () => {
      throw new Error("next should not be called");
    };

    authenticateToken(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.jsonBody).toEqual({ error: "Invalid or expired token" });
  });

  it("attaches the decoded user for valid access tokens", () => {
    const token = generateToken(3, "alice");
    const req: any = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    };
    const res = createMockResponse();
    let called = false;

    authenticateToken(req, res, () => {
      called = true;
    });

    expect(called).toBe(true);
    expect(req.user).toMatchObject({
      userId: 3,
      username: "alice",
      role: "user",
    });
  });
});
