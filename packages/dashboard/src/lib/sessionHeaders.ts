import type { IncomingHttpHeaders } from "http";

const SESSION_HEADER = "df-session-key";

/** Validate the API's encrypted cookie when Next.js runs outside the API process. */
export async function sessionHeaders(
  headers: IncomingHttpHeaders,
): Promise<IncomingHttpHeaders> {
  const backendOrigin = process.env.BACKEND_ORIGIN;
  if (!backendOrigin || process.env.AUTH_MODE !== "single-tenant") {
    return headers;
  }

  // Never accept the internal session header supplied by a browser.
  const verifiedHeaders = { ...headers, [SESSION_HEADER]: "false" };
  if (!headers.cookie) {
    return verifiedHeaders;
  }
  const response = await fetch(
    new URL("/api/public/single-tenant/session", backendOrigin),
    {
      headers: { cookie: headers.cookie },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (response.status !== 204 && response.status !== 401) {
    throw new Error(`Session validation failed: ${response.status}`);
  }
  verifiedHeaders[SESSION_HEADER] = response.status === 204 ? "true" : "false";
  return verifiedHeaders;
}
