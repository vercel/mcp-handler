/**
 * Options controlling how the public-facing origin is derived from a request.
 */
export interface PublicOriginOptions {
  /**
   * Whether to trust proxy-supplied forwarding headers
   * (X-Forwarded-Host, X-Forwarded-Proto, Forwarded).
   *
   * Defaults to `false`. When false, these headers are ignored and the origin
   * is derived from `req.url`. This is the safe default: clients can otherwise
   * spoof the public origin by sending these headers directly when the
   * deployment is not behind a reverse proxy that strips/overwrites them.
   *
   * Set to `true` only when the request has demonstrably traversed a trusted
   * reverse proxy that sanitizes these headers (e.g., a properly configured
   * load balancer, Vercel, Cloudflare).
   *
   * SECURITY: Trusting proxy headers in deployments without such a proxy
   * allows attackers to control the `resource_metadata` URL in
   * WWW-Authenticate responses and the `resource` field of the OAuth
   * Protected Resource Metadata document, potentially redirecting OAuth
   * clients to attacker-controlled servers (CWE-918 / origin spoofing).
   */
  trustProxy?: boolean;
}

/**
 * Get the public-facing origin from a request.
 *
 * By default (and unless `trustProxy: true` is explicitly passed), this
 * function ignores X-Forwarded-* / Forwarded headers and derives the origin
 * from `req.url`. This prevents clients from spoofing the public origin in
 * deployments that are not behind a reverse proxy that sanitizes these
 * headers. See {@link PublicOriginOptions.trustProxy}.
 *
 * When `trustProxy` is `true`, header precedence is:
 * 1. X-Forwarded-Host + X-Forwarded-Proto (most common)
 * 2. Forwarded header (RFC 7239)
 * 3. Falls back to req.url origin
 *
 * @param req - The incoming request
 * @param options - Origin-derivation options
 * @returns The public-facing origin (e.g., "https://example.org")
 */
export function getPublicOrigin(
  req: Request,
  options: PublicOriginOptions = {}
): string {
  if (options.trustProxy) {
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
  }

  // Fallback to req.url origin
  return new URL(req.url).origin;
}

/**
 * Get the public-facing URL from a request.
 *
 * See {@link getPublicOrigin} for the security semantics of `trustProxy`.
 *
 * @param req - The incoming request
 * @param options - Origin-derivation options
 * @returns The public-facing URL with the correct origin
 */
export function getPublicUrl(
  req: Request,
  options: PublicOriginOptions = {}
): URL {
  const url = new URL(req.url);
  const publicOrigin = getPublicOrigin(req, options);

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
