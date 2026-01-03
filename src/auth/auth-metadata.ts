import { OAuthProtectedResourceMetadata } from "@modelcontextprotocol/sdk/shared/auth.js";
import { getPublicUrl } from "../lib/url";

/**
 * CORS headers for OAuth Protected Resource Metadata endpoint.
 * Configured to allow any origin to make the endpoint accessible to web-based MCP clients.
 */
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
};

/**
 * OAuth 2.0 Protected Resource Metadata endpoint based on RFC 9728.
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 *
 * @param authServerUrls - Array of issuer URLs of the OAuth 2.0 Authorization Servers.
 *                        These should match the "issuer" field in the authorization servers'
 *                        OAuth metadata (RFC 8414).
 * @param resourceUrl - Optional explicit resource URL override. When provided, this URL is
 *                      used instead of deriving it from the request. Use this when running
 *                      behind a proxy that doesn't set standard forwarding headers.
 *                      If not provided, the URL is automatically detected from proxy headers
 *                      (X-Forwarded-Host, X-Forwarded-Proto, Forwarded) or falls back to req.url.
 */
export function protectedResourceHandler({
    authServerUrls,
    resourceUrl: explicitResourceUrl,
}: {
    authServerUrls: string[];
    resourceUrl?: string;
}) {
    return (req: Request) => {
        let resource: string;

        if (explicitResourceUrl) {
            // Use explicit override if provided
            resource = explicitResourceUrl;
        } else {
            // Auto-detect from proxy headers or req.url
            const publicUrl = getPublicUrl(req);

            publicUrl.pathname = publicUrl.pathname
              .replace(/^\/\.well-known\/[^\/]+/, "");

            // The URL class does not allow for empty `pathname` and will replace it
            // with "/". Here, we correct that.
            resource = publicUrl.pathname === '/'
              ? publicUrl.toString().replace(/\/$/, '')
              : publicUrl.toString();
        }

        const metadata = generateProtectedResourceMetadata({
            authServerUrls,
            resourceUrl: resource,
        });

        return new Response(JSON.stringify(metadata), {
            headers: {
                ...corsHeaders,
                "Cache-Control": "max-age=3600",
                "Content-Type": "application/json",
            },
        });
    };
}

/**
 * Generates protected resource metadata for the given auth server URLs and
 * protected resource identifier. The protected resource identifier, as defined
 * in RFC 9728, should be a a URL that uses the https scheme and has no fragment
 * component.
 *
 * @param authServerUrls - Array of issuer URLs of the authorization servers. Each URL should 
 *                        match the "issuer" field in the respective authorization server's 
 *                        OAuth metadata (RFC 8414).
 * @param resourceUrl - the protected resource identifier
 * @param additionalMetadata - Additional metadata fields to include in the response
 * @returns Protected resource metadata, serializable to JSON
 */
export function generateProtectedResourceMetadata({
    authServerUrls,
    resourceUrl,
    additionalMetadata,
}: {
    authServerUrls: string[];
    resourceUrl: string;
    additionalMetadata?: Partial<OAuthProtectedResourceMetadata>;
}): OAuthProtectedResourceMetadata {
    return Object.assign(
        {
            resource: resourceUrl,
            authorization_servers: authServerUrls
        },
        additionalMetadata
    );
}

/**
 * CORS options request handler for OAuth metadata endpoints.
 * Necessary for MCP clients that operate in web browsers.
 */
export function metadataCorsOptionsRequestHandler() {
    return () => {
        return new Response(null, {
            status: 200,
            headers: corsHeaders,
        });
    };
}

