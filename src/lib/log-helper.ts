export type McpEventType =
  | "REQUEST_RECEIVED" // When a request is received from the client
  | "REQUEST_COMPLETED" // When a request completes
  | "ERROR"; // When an error occurs during any operation

export interface McpEventBase {
  type: McpEventType;
  timestamp: number;
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
  source: "request" | "system";
  severity: "warning" | "error" | "fatal";
}

export type McpEvent = McpRequestEvent | McpErrorEvent;

export function createEvent<T extends McpEvent>(
  event: Omit<T, "timestamp">,
): T {
  return {
    ...event,
    timestamp: Date.now(),
  } as T;
}
