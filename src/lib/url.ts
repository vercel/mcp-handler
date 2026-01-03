/**
 * Get the public-facing origin from a request, respecting proxy headers.
 *
 * When running behind a reverse proxy (e.g., nginx, Vercel, Cloudflare),
 * the `req.url` typically reflects the internal URL (e.g., http://localhost:3000).
 * This function reconstructs the public-facing origin using standard proxy headers.
 *
 * Header precedence:
 * 1. X-Forwarded-Host + X-Forwarded-Proto (most common)
 * 2. Forwarded header (RFC 7239)
 * 3. Falls back to req.url origin
 *
 * @param req - The incoming request
 * @returns The public-facing origin (e.g., "https://example.org")
 */
export function getPublicOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");

  // If we have X-Forwarded-Host, construct origin from forwarded headers
  if (forwardedHost) {
    // X-Forwarded-Host can contain multiple comma-separated values; use the first (leftmost)
    const host = forwardedHost.split(",")[0].trim();
    // X-Forwarded-Proto can also be comma-separated
    const proto = forwardedProto?.split(",")[0].trim() || "https";
    return `${proto}://${host}`;
  }

  // Check RFC 7239 Forwarded header (less common but standardized)
  const forwarded = req.headers.get("forwarded");
  if (forwarded) {
    const parsed = parseForwardedHeader(forwarded);
    if (parsed.host) {
      const proto = parsed.proto || "https";
      return `${proto}://${parsed.host}`;
    }
  }

  // Fallback to req.url origin
  return new URL(req.url).origin;
}

/**
 * Get the public-facing URL from a request, respecting proxy headers.
 *
 * @param req - The incoming request
 * @returns The public-facing URL with the correct origin
 */
export function getPublicUrl(req: Request): URL {
  const url = new URL(req.url);
  const publicOrigin = getPublicOrigin(req);

  // Construct a new URL with the public origin but preserve pathname, search, and hash
  const result = new URL(url.pathname + url.search + url.hash, publicOrigin);
  return result;
}

/**
 * Parse the RFC 7239 Forwarded header.
 * Example: "for=192.0.2.60;proto=https;host=example.com"
 */
function parseForwardedHeader(
  forwarded: string
): { host?: string; proto?: string } {
  const result: { host?: string; proto?: string } = {};

  // The header can contain multiple comma-separated forwarded elements; use the first
  const firstElement = forwarded.split(",")[0];

  // Parse key=value pairs separated by semicolons
  const pairs = firstElement.split(";");
  for (const pair of pairs) {
    const [key, value] = pair.split("=").map((s) => s.trim().toLowerCase());
    if (key === "host" && value) {
      // Remove surrounding quotes if present
      result.host = value.replace(/^"|"$/g, "");
    } else if (key === "proto" && value) {
      result.proto = value.replace(/^"|"$/g, "");
    }
  }

  return result;
}
