const ORIGIN = "http://localhost:6274";
const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export async function GET(request: Request) {
  const domain = process.env.AUTHKIT_DOMAIN;
  const response = await fetch(
    `https://${domain}/.well-known/oauth-authorization-server`
  );
  const metadata = await response.json();
  console.log("metadata", metadata);

  return new Response(JSON.stringify(metadata), {
    headers: CORS_HEADERS,
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}
