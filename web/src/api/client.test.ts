import { afterEach, describe, expect, test, vi } from "vitest";
import { ApiError, api, duels, errorMessage, runs } from "./client";

function respond(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), { status }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  test("sends JSON with the content type the server requires", async () => {
    const fetchMock = respond(201, { run_id: "r1" });
    await runs.start("typing", "ranked", { mode: "words", words: 25 });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/runs");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).get("content-type")).toBe("application/json");
    expect(JSON.parse(init.body as string)).toEqual({
      test: "typing",
      mode: "ranked",
      settings: { mode: "words", words: 25 },
    });
  });

  test("server errors become ApiError with the server's code and message", async () => {
    respond(401, { error: { code: "invalid_credentials", message: "invalid credentials" } });
    const err = await api("POST", "/auth/login", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 401, code: "invalid_credentials", message: "invalid credentials" });
    expect(errorMessage(err)).toBe("invalid credentials");
  });

  test("network_failures_become_api_errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const err = await api("GET", "/auth/me").catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 0, code: "network" });
    expect(errorMessage(err)).toBe("can't reach the server");
    expect(errorMessage(new Error("boom"))).toBe("something went wrong");
  });

  test("a proxy error without the server's error body means the server is unreachable", async () => {
    for (const status of [500, 502, 503, 504]) {
      respond(status);
      const err = await api("POST", "/runs", {}).catch((e: unknown) => e);
      expect(err).toMatchObject({ status, code: "network", message: "can't reach the server" });
    }
    respond(500, { error: { code: "internal", message: "internal server error" } });
    expect(await api("GET", "/auth/me").catch((e: unknown) => e)).toMatchObject({ code: "internal" });
    respond(413);
    expect(await api("GET", "/auth/me").catch((e: unknown) => e)).toMatchObject({ code: "unknown", message: "request failed (413)" });
  });

  test("204 responses resolve to undefined; GETs send no body", async () => {
    const post = respond(204);
    await expect(api("POST", "/auth/logout")).resolves.toBeUndefined();
    expect((post.mock.calls[0] as unknown as [string, RequestInit])[1].body).toBe("{}");
    const get = respond(200, { kind: "guest" });
    await expect(api("GET", "/auth/me")).resolves.toEqual({ kind: "guest" });
    expect((get.mock.calls[0] as unknown as [string, RequestInit])[1].body).toBeUndefined();
  });

  test("the duel socket url carries the test and how to join", () => {
    vi.stubGlobal("location", { protocol: "https:", host: "diffd.example" });
    expect(duels.socketUrl("maths")).toBe("wss://diffd.example/api/duels/ws?test=maths");
    expect(duels.socketUrl("maths", { invite: true })).toBe("wss://diffd.example/api/duels/ws?test=maths&invite=true");
    vi.stubGlobal("location", { protocol: "http:", host: "localhost:3000" });
    expect(duels.socketUrl("typing", { room: "ABC234" })).toBe("ws://localhost:3000/api/duels/ws?test=typing&room=ABC234");
  });
});
