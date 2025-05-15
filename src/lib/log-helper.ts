export type McpEventType =
  | "SESSION_STARTED" // When a new client session begins (either HTTP or SSE)
  | "SESSION_ENDED" // When a client session ends (SSE disconnection)
  | "REQUEST_RECEIVED" // When a request is received from the client
  | "REQUEST_COMPLETED" // When a request completes
  | "ERROR"; // When an error occurs during any operation

export interface McpEventBase {
  type: McpEventType;
  timestamp: number;
  sessionId?: string;
  requestId?: string; // To track individual requests within a session
}

export interface McpSessionEvent extends McpEventBase {
  type: "SESSION_STARTED" | "SESSION_ENDED";
  transport: "SSE" | "HTTP";
  clientInfo?: {
    userAgent?: string;
    ip?: string;
  };
}

export interface McpRequestEvent extends McpEventBase {
  type: "REQUEST_RECEIVED" | "REQUEST_COMPLETED";
  method: string;
  parameters?: unknown;
  result?: unknown;
  duration?: number; // For REQUEST_COMPLETED events
  status: "success" | "error";
}

export interface McpErrorEvent extends McpEventBase {
  type: "ERROR";
  error: Error | string;
  context?: string;
  source: "request" | "session" | "system";
  severity: "warning" | "error" | "fatal";
}

export type McpEvent = McpSessionEvent | McpRequestEvent | McpErrorEvent;

export function createEvent<T extends McpEvent>(
  event: Omit<T, "timestamp">
): T {
  return {
    ...event,
    timestamp: Date.now(),
  } as T;
}
