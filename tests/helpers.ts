import type { IncomingMessage, ServerResponse } from "node:http";

export function nodeToWebHandler(
  handler: (req: Request) => Promise<Response> | Response,
): (req: IncomingMessage, res: ServerResponse) => void {
  return async (req, res) => {
    const method = (req.method || "GET").toUpperCase();
    const requestBody =
      method === "GET" || method === "HEAD"
        ? undefined
        : await new Promise<ArrayBuffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            req.on("data", (chunk) => {
              chunks.push(chunk);
            });
            req.on("end", () => {
              const buf = Buffer.concat(chunks);
              resolve(
                buf.buffer.slice(
                  buf.byteOffset,
                  buf.byteOffset + buf.byteLength,
                ),
              );
            });
            req.on("error", () => {
              reject(new Error("Failed to read request body"));
            });
          });

    const requestHeaders = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const val of value) {
          requestHeaders.append(key, val);
        }
      } else {
        requestHeaders.append(key, value);
      }
    }

    const reqUrl = new URL(req.url || "/", "http://localhost");
    const webReq = new Request(reqUrl, {
      method: req.method,
      headers: requestHeaders,
      body: requestBody,
    });

    const webResp = await handler(webReq);

    const responseHeaders = Object.fromEntries(webResp.headers);
    res.writeHead(webResp.status, webResp.statusText, responseHeaders);

    if (webResp.body) {
      const reader = webResp.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      } finally {
        reader.releaseLock();
      }
    }
    res.end();
  };
}
