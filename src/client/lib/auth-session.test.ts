import axios from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearAccessToken,
  getAccessToken,
  logoutSession,
  refreshAccessToken,
  setAccessToken,
} from "./auth-session";

vi.mock("axios", () => ({
  default: {
    post: vi.fn(),
  },
}));

describe("client auth session", () => {
  afterEach(() => {
    clearAccessToken();
    vi.clearAllMocks();
  });

  it("stores the access token returned by refresh", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { accessToken: "fresh-access-token" },
    } as never);

    const token = await refreshAccessToken();

    expect(token).toBe("fresh-access-token");
    expect(getAccessToken()).toBe("fresh-access-token");
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent refresh requests", async () => {
    vi.mocked(axios.post).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(() => {
            resolve({ data: { accessToken: "shared-token" } });
          }, 0);
        }) as never,
    );

    const [first, second] = await Promise.all([
      refreshAccessToken(),
      refreshAccessToken(),
    ]);

    expect(first).toBe("shared-token");
    expect(second).toBe("shared-token");
    expect(axios.post).toHaveBeenCalledTimes(1);
  });

  it("clears the token on logout", async () => {
    setAccessToken("active-token");
    vi.mocked(axios.post).mockResolvedValueOnce({} as never);

    await logoutSession();

    expect(getAccessToken()).toBe("");
    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
