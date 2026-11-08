/**
 * Pure CORS-origin helpers. Kept free of dotenv/config side effects so they
 * can be unit tested without any environment file present.
 */

/** True for absolute http(s) origins only ("http://localhost:5173", not "/api" or "http://x/path"). */
function isValidOrigin(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.pathname === "/" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}

/**
 * Parses comma/space separated CLIENT_ORIGIN values, e.g.
 * "http://localhost:5173, http://localhost:4173".
 */
export function parseClientOrigins(raw: string): string[] {
  const origins = raw
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter((value) => value !== "");

  for (const origin of origins) {
    if (!isValidOrigin(origin)) {
      throw new Error(
        `Invalid CLIENT_ORIGIN entry "${origin}". Use absolute origins without a path, ` +
          `e.g. CLIENT_ORIGIN=http://localhost:5173,http://localhost:4173`
      );
    }
  }

  return [...new Set(origins.map((origin) => new URL(origin).origin))];
}

const LOOPBACK_ORIGIN_PATTERN =
  /^(https?):\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;

/**
 * Whether `origin` may call the API: either it is in the configured allow
 * list, or (in development/test only) it is a loop-back origin like the Vite
 * preview port (http://localhost:4173).
 */
export function isAllowedCorsOrigin(
  origin: string | undefined,
  allowedOrigins: readonly string[],
  allowLoopback: boolean
): boolean {
  if (!origin) {
    return false;
  }
  if (allowedOrigins.includes(origin)) {
    return true;
  }
  return allowLoopback && LOOPBACK_ORIGIN_PATTERN.test(origin);
}
