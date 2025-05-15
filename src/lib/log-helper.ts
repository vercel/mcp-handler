export type McpEventType =
  | "SESSION_STARTED" // When a new client session begins (either HTTP or SSE)
  | "SESSION_ENDED" // When a client session ends (SSE disconnection)
  | "TOOL_CALLED" // When a tool is invoked by the client
  | "TOOL_COMPLETED" // When a tool execution completes
  | "FUNCTION_CALLED" // When a function is called by the client
  | "FUNCTION_COMPLETED" // When a function call completes
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

export interface McpToolEvent extends McpEventBase {
  type: "TOOL_CALLED" | "TOOL_COMPLETED";
  toolName: string;
  parameters?: unknown;
  result?: unknown;
  duration?: number; // For TOOL_COMPLETED events
  status: "success" | "error";
}

export interface McpFunctionEvent extends McpEventBase {
  type: "FUNCTION_CALLED" | "FUNCTION_COMPLETED";
  functionName: string;
  parameters?: unknown;
  result?: unknown;
  duration?: number; // For FUNCTION_COMPLETED events
  status: "success" | "error";
}

export interface McpErrorEvent extends McpEventBase {
  type: "ERROR";
  error: Error | string;
  context?: string;
  source: "tool" | "function" | "session" | "system";
  severity: "warning" | "error" | "fatal";
}

export type McpEvent =
  | McpSessionEvent
  | McpToolEvent
  | McpFunctionEvent
  | McpErrorEvent;

export function createEvent<T extends McpEvent>(
  event: Omit<T, "timestamp">
): T {
  return {
    ...event,
    timestamp: Date.now(),
  } as T;
}
