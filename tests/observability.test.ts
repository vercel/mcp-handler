import { describe, it, expect, beforeEach, vi } from "vitest";
import { withObservability, type ObservabilityConfig } from "../src/observability";

// Mock OpenTelemetry
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: vi.fn(() => ({
      startActiveSpan: vi.fn((name, options, callback) => {
        const mockSpan = {
          spanContext: () => ({
            traceId: 'mock-trace-id-123',
            spanId: 'mock-span-id-456',
          }),
          setAttributes: vi.fn(),
          setStatus: vi.fn(),
          recordException: vi.fn(),
          setAttribute: vi.fn(),
          addEvent: vi.fn(),
          end: vi.fn(),
        };
        return callback(mockSpan);
      }),
    })),
    getActiveSpan: vi.fn(() => ({
      spanContext: () => ({
        traceId: 'mock-trace-id-123',
        spanId: 'mock-span-id-456',
      }),
      setAttribute: vi.fn(),
      addEvent: vi.fn(),
    })),
  },
  context: {},
  SpanStatusCode: {
    OK: 'OK',
    ERROR: 'ERROR',
  },
  SpanKind: {
    SERVER: 'SERVER',
    INTERNAL: 'INTERNAL',
  },
}));

describe("withObservability", () => {
  let mockHandler: ReturnType<typeof vi.fn>;
  let config: ObservabilityConfig;

  beforeEach(() => {
    mockHandler = vi.fn();
    config = {
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      enableRequestLogging: false, // Disable for cleaner tests
      enableErrorTracking: true,
    };
  });

  it("should wrap handler and add trace headers to response", async () => {
    const mockResponse = new Response("test response", { status: 200 });
    mockHandler.mockResolvedValue(mockResponse);

    const wrappedHandler = withObservability(mockHandler, config);
    const request = new Request("https://example.com/test", { method: "GET" });

    const result = await wrappedHandler(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
    expect(result.headers.get("x-trace-id")).toBe("mock-trace-id-123");
    expect(result.headers.get("x-span-id")).toBe("mock-span-id-456");
  });

  it("should extract trace context from request headers", async () => {
    const mockResponse = new Response("test response", { status: 200 });
    mockHandler.mockResolvedValue(mockResponse);

    const wrappedHandler = withObservability(mockHandler, config);
    const request = new Request("https://example.com/test", {
      method: "GET",
      headers: {
        "x-trace-id": "existing-trace-123",
        "x-span-id": "existing-span-456",
      },
    });

    await wrappedHandler(request);

    expect(request.traceId).toBe("existing-trace-123");
    expect(request.spanId).toBe("existing-span-456");
  });

  it("should skip tracing for ignored endpoints", async () => {
    const mockResponse = new Response("health ok", { status: 200 });
    mockHandler.mockResolvedValue(mockResponse);

    const configWithIgnored: ObservabilityConfig = {
      ...config,
      ignoreEndpoints: ["/health", "/metrics"],
    };

    const wrappedHandler = withObservability(mockHandler, configWithIgnored);
    const request = new Request("https://example.com/health", { method: "GET" });

    const result = await wrappedHandler(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
    // Should not have trace headers for ignored endpoints
    expect(result.headers.get("x-trace-id")).toBeNull();
    expect(result.headers.get("x-span-id")).toBeNull();
  });

  it("should respect sampling rate", async () => {
    const mockResponse = new Response("test response", { status: 200 });
    mockHandler.mockResolvedValue(mockResponse);

    // Mock Math.random to return 0.9
    const originalRandom = Math.random;
    Math.random = vi.fn(() => 0.9);

    try {
      const configWithSampling: ObservabilityConfig = {
        ...config,
        samplingRate: 0.5, // 50% sampling rate
      };

      const wrappedHandler = withObservability(mockHandler, configWithSampling);
      const request = new Request("https://example.com/test", { method: "GET" });

      const result = await wrappedHandler(request);

      // Should skip tracing due to sampling
      expect(result.headers.get("x-trace-id")).toBeNull();
    } finally {
      Math.random = originalRandom;
    }
  });

  it("should handle errors properly", async () => {
    const error = new Error("Test error");
    mockHandler.mockRejectedValue(error);

    const wrappedHandler = withObservability(mockHandler, config);
    const request = new Request("https://example.com/test", { method: "POST" });

    await expect(wrappedHandler(request)).rejects.toThrow("Test error");
    expect(mockHandler).toHaveBeenCalledWith(request);
  });

  it("should use custom trace headers when specified", async () => {
    const mockResponse = new Response("test response", { status: 200 });
    mockHandler.mockResolvedValue(mockResponse);

    const customConfig: ObservabilityConfig = {
      ...config,
      traceIdHeader: "custom-trace-header",
      spanIdHeader: "custom-span-header",
    };

    const wrappedHandler = withObservability(mockHandler, customConfig);
    const request = new Request("https://example.com/test", {
      method: "GET",
      headers: {
        "custom-trace-header": "custom-trace-123",
        "custom-span-header": "custom-span-456",
      },
    });

    const result = await wrappedHandler(request);

    expect(request.traceId).toBe("custom-trace-123");
    expect(request.spanId).toBe("custom-span-456");
    expect(result.headers.get("custom-trace-header")).toBe("mock-trace-id-123");
    expect(result.headers.get("custom-span-header")).toBe("mock-span-id-456");
  });

  it("should add custom attributes", async () => {
    const mockResponse = new Response("test response", { status: 200 });
    mockHandler.mockResolvedValue(mockResponse);

    const customConfig: ObservabilityConfig = {
      ...config,
      customAttributes: {
        "service.environment": "test",
        "custom.number": 42,
        "custom.boolean": true,
      },
    };

    const wrappedHandler = withObservability(mockHandler, customConfig);
    const request = new Request("https://example.com/test", { method: "GET" });

    await wrappedHandler(request);

    expect(mockHandler).toHaveBeenCalledWith(request);
  });
});