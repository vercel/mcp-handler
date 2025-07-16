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
});

