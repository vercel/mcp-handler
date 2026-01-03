import { describe, it, expect } from "vitest";
import { protectedResourceHandler } from "../src/index";

describe("auth", () => {
  describe("resource metadata URL to resource identifier mapping", () => {
    const handler = protectedResourceHandler({
      authServerUrls: ["https://auth-server.com"],
    });

    const testCases = [
      // Default well-known URI suffix (oauth-protected-resource)
      {
        resourceMetadata: 'https://resource-server.com/.well-known/oauth-protected-resource',
        resource: 'https://resource-server.com',
      },
      {
        resourceMetadata: 'https://resource-server.com/.well-known/oauth-protected-resource/my-resource',
        resource: 'https://resource-server.com/my-resource',
      },
      {
        resourceMetadata: 'https://resource-server.com/.well-known/oauth-protected-resource/foo/bar',
        resource: 'https://resource-server.com/foo/bar',
      },
      // Ensure ports work
      {
        resourceMetadata: 'https://resource-server.com:8443/.well-known/oauth-protected-resource',
        resource: 'https://resource-server.com:8443',
      },
      // Example well-known URI suffix from RFC 9728 (example-protected-resource)
      {
        resourceMetadata: 'https://resource-server.com/.well-known/example-protected-resource',
        resource: 'https://resource-server.com',
      },
      {
        resourceMetadata: 'https://resource-server.com/.well-known/example-protected-resource/my-resource',
        resource: 'https://resource-server.com/my-resource',
      },
    ] as const;

    testCases.forEach(testCase => {
      it(`${testCase.resourceMetadata} → ${testCase.resource}`, async () => {
        const req = new Request(testCase.resourceMetadata);
        const res = handler(req);
        const json = await res.json();
        expect(json.resource).toBe(testCase.resource);
      });
    });
  });

  describe("proxy header support", () => {
    const handler = protectedResourceHandler({
      authServerUrls: ["https://auth-server.com"],
    });

    it("uses X-Forwarded-Host and X-Forwarded-Proto headers", async () => {
      const req = new Request("http://localhost:3000/.well-known/oauth-protected-resource", {
        headers: {
          "X-Forwarded-Host": "example.org",
          "X-Forwarded-Proto": "https",
        },
      });
      const res = handler(req);
      const json = await res.json();
      expect(json.resource).toBe("https://example.org");
    });

    it("handles X-Forwarded-Host with multiple values (uses first)", async () => {
      const req = new Request("http://localhost:3000/.well-known/oauth-protected-resource", {
        headers: {
          "X-Forwarded-Host": "example.org, proxy1.internal, proxy2.internal",
          "X-Forwarded-Proto": "https",
        },
      });
      const res = handler(req);
      const json = await res.json();
      expect(json.resource).toBe("https://example.org");
    });

    it("defaults to https when X-Forwarded-Proto is missing", async () => {
      const req = new Request("http://localhost:3000/.well-known/oauth-protected-resource", {
        headers: {
          "X-Forwarded-Host": "example.org",
        },
      });
      const res = handler(req);
      const json = await res.json();
      expect(json.resource).toBe("https://example.org");
    });

    it("uses RFC 7239 Forwarded header", async () => {
      const req = new Request("http://localhost:3000/.well-known/oauth-protected-resource", {
        headers: {
          "Forwarded": "host=example.org;proto=https",
        },
      });
      const res = handler(req);
      const json = await res.json();
      expect(json.resource).toBe("https://example.org");
    });

    it("preserves path when using proxy headers", async () => {
      const req = new Request("http://localhost:3000/.well-known/oauth-protected-resource/my-resource", {
        headers: {
          "X-Forwarded-Host": "example.org",
          "X-Forwarded-Proto": "https",
        },
      });
      const res = handler(req);
      const json = await res.json();
      expect(json.resource).toBe("https://example.org/my-resource");
    });

    it("falls back to req.url when no proxy headers present", async () => {
      const req = new Request("https://direct-server.com/.well-known/oauth-protected-resource");
      const res = handler(req);
      const json = await res.json();
      expect(json.resource).toBe("https://direct-server.com");
    });
  });

  describe("explicit resourceUrl override", () => {
    it("uses explicit resourceUrl when provided", async () => {
      const handler = protectedResourceHandler({
        authServerUrls: ["https://auth-server.com"],
        resourceUrl: "https://my-public-domain.com",
      });

      const req = new Request("http://localhost:3000/.well-known/oauth-protected-resource", {
        headers: {
          "X-Forwarded-Host": "different-proxy.org",
          "X-Forwarded-Proto": "https",
        },
      });
      const res = handler(req);
      const json = await res.json();
      // Should use explicit override, ignoring both req.url and proxy headers
      expect(json.resource).toBe("https://my-public-domain.com");
    });
  });
});

