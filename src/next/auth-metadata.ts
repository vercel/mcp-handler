import { OAuthProtectedResourceMetadata } from "@modelcontextprotocol/sdk/shared/auth";

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
 */
export function protectedResourceHandler({
    authServerUrls,
}: {
    authServerUrls: string[];
}) {
    return (req: Request) => {
        const origin = new URL(req.url).origin;

        const metadata = generateProtectedResourceMetadata({
            authServerUrls,
            resourceUrl: origin,
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
 * Generates protected resource metadata for the given auth server urls and
 * resource server url.
 *
 * @param authServerUrls - Array of issuer URLs of the authorization servers. Each URL should 
 *                        match the "issuer" field in the respective authorization server's 
 *                        OAuth metadata (RFC 8414).
 * @param resourceUrl - URL of the resource server
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

