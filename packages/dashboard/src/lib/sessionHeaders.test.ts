import { sessionHeaders } from "./sessionHeaders";

describe("split deployment session validation", () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH_MODE: "single-tenant",
      BACKEND_ORIGIN: "https://api.example.com",
    };
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });
  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("rejects a forged internal header without a cookie", async () => {
    expect(await sessionHeaders({ "df-session-key": "true" })).toEqual({
      "df-session-key": "false",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects an invalid cookie even with a forged internal header", async () => {
    fetchMock.mockResolvedValue({ status: 401 });
    expect(
      (
        await sessionHeaders({
          cookie: "session=invalid",
          "df-session-key": "true",
        })
      )["df-session-key"],
    ).toBe("false");
  });
  it("accepts a cookie only after backend verification", async () => {
    fetchMock.mockResolvedValue({ status: 204 });
    expect(
      (
        await sessionHeaders({
          cookie: "session=valid",
          authorization: "unrelated",
        })
      )["df-session-key"],
    ).toBe("true");
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("Session verification did not call the backend");
    const [url, options] = call;
    expect(String(url)).toBe(
      "https://api.example.com/api/public/single-tenant/session",
    );
    expect(options).toMatchObject({
      headers: { cookie: "session=valid" },
      cache: "no-store",
      redirect: "error",
    });
  });
  it("fails closed when the backend is unavailable", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    await expect(sessionHeaders({ cookie: "session=valid" })).rejects.toThrow(
      "offline",
    );
    fetchMock.mockResolvedValue({ status: 500 });
    await expect(sessionHeaders({ cookie: "session=valid" })).rejects.toThrow(
      "500",
    );
  });
  it("preserves the integrated deployment flow", async () => {
    delete process.env.BACKEND_ORIGIN;
    const headers = { "df-session-key": "true" };
    expect(await sessionHeaders(headers)).toBe(headers);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
