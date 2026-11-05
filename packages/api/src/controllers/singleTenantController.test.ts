import "@fastify/swagger";

import cookie from "@fastify/cookie";
import secureSession from "@fastify/secure-session";
import fastify from "fastify";

import authController from "./singleTenantController";

jest.mock("backend-lib/src/config", () => () => ({
  authMode: "single-tenant",
  password: "test-password",
}));
jest.mock("backend-lib/src/requestContext", () => ({
  SESSION_KEY: "df-session-key",
}));
jest.mock("backend-lib/src/logger", () => () => ({ error: jest.fn() }));

describe("single-tenant session verification endpoint", () => {
  const app = fastify();
  beforeAll(async () => {
    await app.register(cookie);
    await app.register(secureSession, {
      key: Buffer.alloc(32, 7),
      cookie: { path: "/", httpOnly: true },
    });
    await app.register(authController, { prefix: "/api/public/single-tenant" });
  });
  afterAll(async () => app.close());

  it("rejects a forged internal session header", async () => {
    const r = await app.inject({
      url: "/api/public/single-tenant/session",
      headers: { "df-session-key": "true" },
    });
    expect(r.statusCode).toBe(401);
    expect(r.headers["cache-control"]).toBe("private, no-store");
  });
  it("rejects an incorrect password", async () => {
    const r = await app.inject({
      method: "POST",
      url: "/api/public/single-tenant/login",
      payload: { password: "wrong" },
    });
    expect(r.statusCode).toBe(401);
    expect(r.cookies).toHaveLength(0);
  });
  it("verifies an encrypted login cookie and rejects a tampered cookie", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/public/single-tenant/login",
      payload: { password: "test-password" },
    });
    expect(login.statusCode).toBe(200);
    const sessionCookie = login.cookies[0];
    if (!sessionCookie)
      throw new Error("Login did not return a session cookie");
    const valid = await app.inject({
      url: "/api/public/single-tenant/session",
      cookies: { [sessionCookie.name]: sessionCookie.value },
    });
    expect(valid.statusCode).toBe(204);
    const invalid = await app.inject({
      url: "/api/public/single-tenant/session",
      cookies: { [sessionCookie.name]: `${sessionCookie.value}tampered` },
    });
    expect(invalid.statusCode).toBe(401);
    const logout = await app.inject({
      url: "/api/public/single-tenant/signout",
      cookies: { [sessionCookie.name]: sessionCookie.value },
    });
    expect(logout.statusCode).toBe(302);
    expect(logout.headers.location).toBe("/dashboard/auth/single-tenant");
    expect(logout.cookies[0]?.value).toBe("");
  });
});
