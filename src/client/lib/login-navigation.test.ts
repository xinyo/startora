import { describe, expect, it, vi } from "vitest";
import { navigateAfterLogin } from "./login-navigation";

describe("login navigation", () => {
  it("routes authenticated users to the home page", async () => {
    const router = {
      push: vi.fn().mockResolvedValue(undefined),
    };

    await navigateAfterLogin(router);

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith("/");
  });
});
