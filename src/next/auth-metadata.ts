/**
 * CORS headers for OAuth metadata endpoints.
 * Configured to allow any origin to make endpoints accessible to web-based MCP clients.
 */
const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Max-Age": "86400",
};

/**
 * RFC 9728 OAuth Protected Resource Metadata
 * @see https://datatracker.ietf.org/doc/html/rfc9728
 */
export interface OAuthProtectedResourceMetadata {
    /** The identifier for this protected resource */
    resource: string;
    /** Array of issuer URLs of the authorization servers */
    authorization_servers?: string[];
    /** URL of the JSON Web Key Set containing the resource's public keys */
    jwks_uri?: string;
    /** List of OAuth scopes supported by this resource */
    scopes_supported?: string[];
    /** List of supported HTTP authentication methods for bearer token usage */
    bearer_methods_supported?: string[];
    /** List of JWS signing algorithms supported by the resource server */
    resource_signing_alg_values_supported?: string[];
    /** Human-readable name of the protected resource */
    resource_name?: string;
    /** URL of the protected resource's documentation */
    resource_documentation?: string;
    /** URL of the protected resource's policy documentation */
    resource_policy_uri?: string;
    /** URL of the protected resource's terms of service */
    resource_tos_uri?: string;
    /** Whether the resource requires certificate-bound access tokens */
    tls_client_certificate_bound_access_tokens?: boolean;
    /** List of authorization details types supported by this resource */
    authorization_details_types_supported?: string[];
    /** List of JWS signing algorithms supported for DPoP proofs */
    dpop_signing_alg_values_supported?: string[];
    /** Whether DPoP bound access tokens are required */
    dpop_bound_access_tokens_required?: boolean;
    /** Additional metadata parameters as defined in RFC 9728 */
    [key: string]: unknown;
}

/**
 * OAuth 2.0 Protected Resource Metadata endpoint based on RFC 9728.
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

        return Response.json(metadata, {
            headers: Object.assign(
                {
                    "Cache-Control": "max-age=3600",
                    "Content-Type": "application/json",
                },
                corsHeaders
            ),
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

