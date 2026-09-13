/**
 * Server-Sent Events over a POST response. The client reads it with fetch +
 * ReadableStream (EventSource only supports GET). Events are `event: <name>`
 * + `data: <json>` blocks, plus a comment heartbeat every 15s to keep proxies
 * from closing idle connections.
 */
export interface SseWriter {
  send: (event: string, data: unknown) => void;
  close: () => void;
  readonly closed: boolean;
}

export function sseResponse(run: (w: SseWriter) => Promise<void>): Response {
  const encoder = new TextEncoder();
  let closed = false;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (s: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          closed = true;
        }
      };
      const writer: SseWriter = {
        send: (event, data) =>
          write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        close: () => {
          if (closed) return;
          closed = true;
          if (heartbeat) clearInterval(heartbeat);
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
        get closed() {
          return closed;
        },
      };
      heartbeat = setInterval(() => write(`: ping\n\n`), 15000);
      write(`: connected\n\n`);
      run(writer)
        .catch((e) => {
          writer.send("error", {
            code: "INTERNAL_ERROR",
            message: e instanceof Error ? e.message : "שגיאה לא צפויה",
          });
        })
        .finally(() => writer.close());
    },
    cancel() {
      closed = true;
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
