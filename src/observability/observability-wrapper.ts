import { trace, context, SpanStatusCode, SpanKind } from '@opentelemetry/api';

export interface ObservabilityConfig {
  serviceName: string;
  serviceVersion?: string;
  traceIdHeader?: string;
  spanIdHeader?: string;
  customAttributes?: Record<string, string | number | boolean>;
  enableRequestLogging?: boolean;
  enableErrorTracking?: boolean;
  ignoreEndpoints?: string[];
  samplingRate?: number;
}

declare global {
  interface Request {
    traceId?: string;
    spanId?: string;
  }
}

export function withObservability(
  handler: (req: Request) => Response | Promise<Response>,
  config: ObservabilityConfig
) {
  const {
    serviceName,
    serviceVersion = '1.0.0',
    traceIdHeader = 'x-trace-id',
    spanIdHeader = 'x-span-id',
    customAttributes = {},
    enableRequestLogging = true,
    enableErrorTracking = true,
    ignoreEndpoints = [],
    samplingRate = 1.0,
  } = config;

  const tracer = trace.getTracer(serviceName, serviceVersion);

  return async (req: Request) => {
    const url = new URL(req.url);
    const method = req.method || 'GET';
    const pathname = url.pathname;

    // Skip tracing for ignored endpoints
    if (ignoreEndpoints.some(endpoint => pathname.startsWith(endpoint))) {
      return handler(req);
    }

    // Apply sampling rate
    if (Math.random() > samplingRate) {
      return handler(req);
    }

    // Extract trace context from headers if present
    const traceId = req.headers.get(traceIdHeader);
    const spanId = req.headers.get(spanIdHeader);

    // Attach trace info to request
    if (traceId) req.traceId = traceId;
    if (spanId) req.spanId = spanId;

    const spanName = `${method} ${pathname}`;
    
    return tracer.startActiveSpan(
      spanName,
      {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': method,
          'http.url': req.url,
          'http.scheme': url.protocol.replace(':', ''),
          'http.host': url.host,
          'http.target': pathname,
          'http.user_agent': req.headers.get('user-agent') || '',
          'service.name': serviceName,
          'service.version': serviceVersion,
          ...customAttributes,
        },
      },
      async (span) => {
        const startTime = Date.now();

        try {
          // Log request if enabled
          if (enableRequestLogging) {
            console.log(`[${serviceName}] ${method} ${pathname} - Started`, {
              traceId: span.spanContext().traceId,
              spanId: span.spanContext().spanId,
            });
          }

          // Execute the original handler
          const response = await handler(req);
          const duration = Date.now() - startTime;

          // Add response attributes to span
          span.setAttributes({
            'http.status_code': response.status,
            'http.response.duration_ms': duration,
          });

          // Set span status based on response
          if (response.status >= 400) {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: `HTTP ${response.status}`,
            });
          } else {
            span.setStatus({ code: SpanStatusCode.OK });
          }

          // Log response if enabled
          if (enableRequestLogging) {
            console.log(`[${serviceName}] ${method} ${pathname} - ${response.status} (${duration}ms)`, {
              traceId: span.spanContext().traceId,
              spanId: span.spanContext().spanId,
              status: response.status,
              duration,
            });
          }

          // Add trace headers to response
          const responseHeaders = new Headers(response.headers);
          responseHeaders.set(traceIdHeader, span.spanContext().traceId);
          responseHeaders.set(spanIdHeader, span.spanContext().spanId);

          return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
          });

        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Record error in span
          span.recordException(error as Error);
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });

          span.setAttributes({
            'error': true,
            'error.type': error instanceof Error ? error.constructor.name : 'Unknown',
            'error.message': error instanceof Error ? error.message : String(error),
            'http.response.duration_ms': duration,
          });

          // Log error if enabled
          if (enableErrorTracking) {
            console.error(`[${serviceName}] ${method} ${pathname} - Error (${duration}ms)`, {
              traceId: span.spanContext().traceId,
              spanId: span.spanContext().spanId,
              error: error instanceof Error ? error.message : String(error),
              duration,
            });
          }

          throw error;
        } finally {
          span.end();
        }
      }
    );
  };
}

export function createObservabilitySpan(
  name: string,
  serviceName: string,
  attributes?: Record<string, string | number | boolean>
) {
  const tracer = trace.getTracer(serviceName);
  return tracer.startSpan(name, {
    kind: SpanKind.INTERNAL,
    attributes,
  });
}

export function getCurrentSpan() {
  return trace.getActiveSpan();
}

export function addSpanAttribute(key: string, value: string | number | boolean) {
  const span = getCurrentSpan();
  if (span) {
    span.setAttribute(key, value);
  }
}

export function addSpanEvent(name: string, attributes?: Record<string, string | number | boolean>) {
  const span = getCurrentSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}