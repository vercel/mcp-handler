import { describe, it, expect } from 'vitest';
import type { ServerResponse } from 'node:http';
import { createServerResponseAdapter } from '../src/handler/server-response-adapter';

/**
 * Regression tests for vercel/mcp-handler#128:
 * "Server is crashing if the client aborts the request before response is sent".
 *
 * The adapter previously fired the handler and the async Response builder as
 * fire-and-forget (`void fn(...)` / `void (async () => ...)()`) with no
 * `.catch`, so a rejection on an aborted request surfaced as a process-level
 * unhandled rejection. It also enqueued to / closed the stream controller
 * without guarding for the case where the underlying socket was already gone.
 */
describe('createServerResponseAdapter abort handling', () => {
  /**
   * Collect unhandled rejections during the body of `run`. Returns any that
   * fired. Without the fix, an aborted handler rejection lands here.
   */
  async function collectUnhandledRejections(
    run: () => Promise<void>
  ): Promise<unknown[]> {
    const captured: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      captured.push(reason);
    };
    process.on('unhandledRejection', onUnhandled);
    try {
      await run();
      // Give any queued microtasks / fire-and-forget promises a chance to
      // reject and surface as unhandled rejections.
      await new Promise(resolve => setTimeout(resolve, 50));
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
    return captured;
  }

  it('does not produce an unhandled rejection when the handler rejects after client abort', async () => {
    const controller = new AbortController();

    const rejections = await collectUnhandledRejections(async () => {
      const responsePromise = createServerResponseAdapter(
        controller.signal,
        async (res: ServerResponse) => {
          // Handler writes a head, then the client aborts before the body is
          // fully sent, then the handler rejects (mirrors the "Error: aborted"
          // path in the issue stack trace).
          res.writeHead(200, { 'content-type': 'text/event-stream' });
          controller.abort();
          await new Promise(resolve => setTimeout(resolve, 0));
          throw new Error('aborted');
        }
      );

      // The adapter should still resolve a Response (head was written) and must
      // not throw at the call site.
      const response = await responsePromise;
      expect(response).toBeInstanceOf(Response);
    });

    expect(rejections).toEqual([]);
  });

  it('does not throw when the response stream is enqueued/closed after abort', async () => {
    const controller = new AbortController();

    const rejections = await collectUnhandledRejections(async () => {
      const response = await createServerResponseAdapter(
        controller.signal,
        (res: ServerResponse) => {
          res.writeHead(200);
          res.write('chunk-before-abort');
          // Socket goes away.
          controller.abort();
          // Writing/closing after abort must not throw or reject.
          res.write('chunk-after-abort');
          res.end();
        }
      );

      expect(response).toBeInstanceOf(Response);
    });

    expect(rejections).toEqual([]);
  });

  it('still resolves a normal (non-aborted) response correctly', async () => {
    const controller = new AbortController();

    const response = await createServerResponseAdapter(
      controller.signal,
      (res: ServerResponse) => {
        res.writeHead(201, { 'x-test': 'ok' });
        res.write('hello');
        res.end();
      }
    );

    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(201);
    expect(response.headers.get('x-test')).toBe('ok');
    expect(await response.text()).toBe('hello');
  });
});
