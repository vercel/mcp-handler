import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const response =  NextResponse.json({
    resource: new URL(request.url).origin,
    authorization_servers: [`https://${process.env.STYTCH_DOMAIN}`],
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}
