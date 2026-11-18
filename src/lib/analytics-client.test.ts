import { afterEach, describe, expect, it, vi } from "vitest";
import { AnalyticsError, analyticsBaseUrl, postToAnalytics, serviceToken } from "./analytics-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("serviceToken", () => {
  it("matches the Python service's derivation (tests/python/test_auth.py)", () => {
    expect(serviceToken("abc")).toBe("caeb3bee8263b115a16a2539b75f1a34f50cf129b750409a1d012e208ee95585");
  });
});

describe("analyticsBaseUrl", () => {
  it("prefers ANALYTICS_URL and trims trailing slashes", () => {
    expect(analyticsBaseUrl({ ANALYTICS_URL: "http://127.0.0.1:8000/" })).toBe(
      "http://127.0.0.1:8000",
    );
  });

  it("uses the site's own domain in production", () => {
    const env = { VERCEL_ENV: "production", BETTER_AUTH_URL: "https://www.example.org/" };
    expect(analyticsBaseUrl(env)).toBe("https://www.example.org/api/analytics");
  });

  it("is off for previews and local dev unless configured", () => {
    expect(analyticsBaseUrl({ VERCEL_ENV: "preview", BETTER_AUTH_URL: "https://x" })).toBeNull();
    expect(analyticsBaseUrl({})).toBeNull();
  });
});

describe("postToAnalytics", () => {
  it("throws AnalyticsError when the service isn't configured", async () => {
    vi.stubEnv("ANALYTICS_URL", "");
    await expect(postToAnalytics("score", {})).rejects.toBeInstanceOf(AnalyticsError);
  });

  it("signs requests with the derived token", async () => {
    vi.stubEnv("ANALYTICS_URL", "http://analytics.test");
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await postToAnalytics("summary", { a: 1 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://analytics.test/summary");
    expect(init.headers.Authorization).toBe(`Bearer ${serviceToken(process.env.BETTER_AUTH_SECRET!)}`);
    expect(JSON.parse(init.body)).toEqual({ a: 1 });
  });

  it("turns error statuses and network failures into AnalyticsError", async () => {
    vi.stubEnv("ANALYTICS_URL", "http://analytics.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 401 })));
    await expect(postToAnalytics("score", {})).rejects.toMatchObject({ name: "AnalyticsError", status: 401 });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(postToAnalytics("score", {})).rejects.toBeInstanceOf(AnalyticsError);
  });
});
