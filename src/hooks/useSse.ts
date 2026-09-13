"use client";

import { ApiError } from "@/lib/api";

export interface SseEvent {
  event: string;
  data: unknown;
}

/**
 * POSTs JSON and consumes a text/event-stream response (EventSource is GET-only).
 * Resolves when the stream ends; rejects on transport errors. Application-level
 * `error` events are delivered to `onEvent` like any other event.
 */
export async function streamSse(
  url: string,
  body: unknown,
  onEvent: (e: SseEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "text/event-stream" },
      body: JSON.stringify(body ?? {}),
      signal,
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    throw new ApiError(0, { code: "NETWORK", message: "אין חיבור לשרת" });
  }
  if (!res.ok || !res.body) {
    let err: ConstructorParameters<typeof ApiError>[1] = { message: res.statusText };
    try {
      err = ((await res.json()) as { error?: typeof err }).error ?? err;
    } catch {
      /* non-json */
    }
    throw new ApiError(res.status, err);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  const dispatch = (block: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const line of block.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const raw = dataLines.join("\n");
    let data: unknown = raw;
    try {
      data = JSON.parse(raw);
    } catch {
      /* keep raw */
    }
    onEvent({ event, data });
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (block.trim()) dispatch(block);
      }
    }
    if (buf.trim()) dispatch(buf);
  } catch (e) {
    if ((e as Error).name !== "AbortError") throw e;
  }
}
