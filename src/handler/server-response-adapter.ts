import { EventEmitter } from 'node:events';
import type { ServerResponse } from 'node:http';

type WriteheadArgs = {
  statusCode: number;
  headers?: Record<string, string>;
};

// biome-ignore lint/suspicious/noExplicitAny: Not deterministic
export type BodyType = string | Buffer | Record<string, any> | null;

type EventListener = (...args: unknown[]) => void;

/**
 * Anthropic's MCP API requires a server response object. This function
 * creates a fake server response object that can be used to pass to the MCP API.
 */
export function createServerResponseAdapter(
  signal: AbortSignal,
  fn: (re: ServerResponse) => Promise<void> | void
): Promise<Response> {
  let writeHeadResolver: (v: WriteheadArgs) => void;
  const writeHeadPromise = new Promise<WriteheadArgs>(resolve => {
    writeHeadResolver = resolve;
  });

  return new Promise(resolve => {
    let controller: ReadableStreamController<Uint8Array> | undefined;
    let shouldClose = false;
    let wroteHead = false;
    let statusCode = 200;
    let headers: Record<string, string> | undefined;

    const writeHead = (code: number, headersArg?: Record<string, string>) => {
      if (typeof headersArg === 'string') {
        throw new Error('Status message of writeHead not supported');
      }
      statusCode = code;
      headers = headersArg;
      wroteHead = true;
      writeHeadResolver({
        statusCode,
        headers,
      });
      return fakeServerResponse;
    };

    const bufferedData: Uint8Array[] = [];

    const write = (
      chunk: Buffer | string | Uint8Array,
      encoding?: BufferEncoding
    ): boolean => {
      if (encoding) {
        throw new Error('Encoding not supported');
      }
      if (chunk instanceof Buffer) {
        throw new Error('Buffer not supported');
      }

      // SDK 1.25+ uses Hono which sends Uint8Array (already encoded)
      // SDK 1.24- sends strings that need encoding
      let data: Uint8Array;
      if (chunk instanceof Uint8Array) {
        data = chunk;
      } else if (typeof chunk === 'string') {
        data = new TextEncoder().encode(chunk);
      } else {
        throw new Error('Unexpected chunk type: ' + typeof chunk);
      }

      if (!wroteHead) {
        writeHead(statusCode, headers);
      }
      if (!controller) {
        bufferedData.push(data);
        return true;
      }
      try {
        controller.enqueue(data);
      } catch {
        // The stream may already be closed/errored if the client aborted the
        // request before the response finished. Dropping the chunk is correct
        // here; there is no socket left to write to.
      }
      return true;
    };

    const eventEmitter = new EventEmitter();

    const fakeServerResponse = {
      writeHead,
      write,
      end: (data?: Buffer | string) => {
        if (data) {
          write(data);
        }

        if (!controller) {
          shouldClose = true;
          return fakeServerResponse;
        }
        try {
          controller.close();
        } catch {
          /* May be closed on tcp layer */
        }
        return fakeServerResponse;
      },
      on: (event: string, listener: EventListener) => {
        eventEmitter.on(event, listener);
        return fakeServerResponse;
      },
      get statusCode() {
        return statusCode;
      },
      set statusCode(code: number) {
        statusCode = code;

        // If the status code is set after writeHead, we need to call
        // writeHead again to update the status code.
        if (wroteHead) {
          writeHeadResolver({
            statusCode,
            headers,
          });
        }
      },
    };

    signal.addEventListener('abort', () => {
      eventEmitter.emit('close');
    });

    // The handler runs fire-and-forget. If the client aborts before the
    // response is fully sent, the underlying request rejects with
    // "Error: aborted"; without this catch that rejection surfaces as a
    // process-level unhandled rejection and crashes the server (issue #128).
    Promise.resolve(fn(fakeServerResponse as ServerResponse)).catch(err => {
      if (signal.aborted) {
        // Expected when the client went away before we finished; nothing to do.
        return;
      }
      // Otherwise this is a real handler error. Surface it without crashing the
      // process so the abort guard above does not mask genuine failures.
      console.error('mcp-handler: request handler error', err);
    });

    void (async () => {
      const head = await writeHeadPromise;

      const response = new Response(
        new ReadableStream({
          start(c) {
            controller = c;
            try {
              for (const chunk of bufferedData) {
                controller.enqueue(chunk);
              }
              if (shouldClose) {
                controller.close();
              }
            } catch {
              // The client may have already aborted, in which case the stream
              // is closed/errored. Flushing buffered data is then a no-op.
            }
          },
        }),
        {
          status: head.statusCode,
          headers: head.headers,
        }
      );

      resolve(response);
    })().catch(err => {
      // Building the Response should not reject, but guard the fire-and-forget
      // IIFE so an unexpected rejection (e.g. during/after abort) cannot become
      // an unhandled rejection that crashes the server.
      if (!signal.aborted) {
        console.error('mcp-handler: response builder error', err);
      }
    });
  });
}
