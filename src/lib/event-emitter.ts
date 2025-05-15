import { ServerResponse, type IncomingMessage } from "node:http";
import {
  type McpErrorEvent,
  type McpEvent,
  type McpRequestEvent,
  type McpSessionEvent,
  createEvent,
} from "./log-helper";

export class EventEmittingResponse extends ServerResponse {
  private onEvent?: (event: McpEvent) => void;
  private sessionId?: string;
  private requestId: string;
  private startTime: number;

  constructor(
    req: IncomingMessage,
    onEvent?: (event: McpEvent) => void,
    sessionId?: string
  ) {
    super(req);
    this.onEvent = onEvent;
    this.sessionId = sessionId;
    this.requestId = crypto.randomUUID();
    this.startTime = Date.now();
  }

  emitEvent(event: Omit<McpEvent, "timestamp" | "sessionId" | "requestId">) {
    if (this.onEvent) {
      this.onEvent(
        createEvent({
          ...event,
          sessionId: this.sessionId,
          requestId: this.requestId,
        } as Omit<McpEvent, "timestamp">)
      );
    }
  }

  startSession(
    transport: "SSE" | "HTTP",
    clientInfo?: { userAgent?: string; ip?: string }
  ) {
    this.emitEvent({
      type: "SESSION_STARTED",
      transport,
      clientInfo,
    } as Omit<McpSessionEvent, "timestamp" | "sessionId" | "requestId">);
  }

  endSession(transport: "SSE" | "HTTP") {
    this.emitEvent({
      type: "SESSION_ENDED",
      transport,
    } as Omit<McpSessionEvent, "timestamp" | "sessionId" | "requestId">);
  }

  requestReceived(method: string, parameters?: unknown) {
    this.emitEvent({
      type: "REQUEST_RECEIVED",
      method,
      parameters,
      status: "success",
    } as Omit<McpRequestEvent, "timestamp" | "sessionId" | "requestId">);
  }

  requestCompleted(method: string, result?: unknown, error?: Error | string) {
    this.emitEvent({
      type: "REQUEST_COMPLETED",
      method,
      result,
      duration: Date.now() - this.startTime,
      status: error ? "error" : "success",
    } as Omit<McpRequestEvent, "timestamp" | "sessionId" | "requestId">);

    if (error) {
      this.error(error, `Error executing request ${method}`, "request");
    }
  }

  error(
    error: Error | string,
    context?: string,
    source: McpErrorEvent["source"] = "system",
    severity: McpErrorEvent["severity"] = "error"
  ) {
    this.emitEvent({
      type: "ERROR",
      error,
      context,
      source,
      severity,
    } as Omit<McpErrorEvent, "timestamp" | "sessionId" | "requestId">);
  }

  end(
    chunk?: unknown,
    encoding?: BufferEncoding | (() => void),
    cb?: () => void
  ): this {
    let finalChunk = chunk;
    let finalEncoding = encoding;
    let finalCallback = cb;

    if (typeof chunk === "function") {
      finalCallback = chunk as () => void;
      finalChunk = undefined;
      finalEncoding = undefined;
    } else if (typeof encoding === "function") {
      finalCallback = encoding as () => void;
      finalEncoding = undefined;
    }

    return super.end(
      finalChunk as string | Buffer,
      finalEncoding as BufferEncoding,
      finalCallback
    );
  }
}
