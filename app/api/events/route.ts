/**
 * GET /api/events — the staff push stream (Server-Sent Events).
 *
 * Replaces a Socket.io service on its own port, plus a hand-rolled reconnect
 * loop in the browser that gave up permanently after five attempts. EventSource
 * reconnects on its own, indefinitely, with a backoff the browser owns — which
 * is what you want on a train.
 *
 * Authorised like every other staff route. An unauthenticated event stream
 * would leak, in real time, what strangers are losing and where they were
 * sitting.
 */

import { authoriseStaff } from '@/lib/server/auth';
import { frame, heartbeat, subscribe, type StaffEvent } from '@/lib/server/events';

export const dynamic = 'force-dynamic';
// Node, not edge: the event bus is an in-process EventEmitter, and the edge
// runtime would put this handler in a different process from the one that
// publishes.
export const runtime = 'nodejs';

/** Long enough to keep proxies from closing an idle connection, short enough to notice a dead one. */
const HEARTBEAT_MS = 25_000;

export async function GET(request: Request) {
  // The one route that accepts a token on the URL: EventSource cannot send
  // headers. See AuthOptions for why that is acceptable here and nowhere else.
  const auth = authoriseStaff(request, { allowQueryToken: true });
  if (!auth.ok) {
    return new Response(JSON.stringify({ success: false, error: auth.reason }), {
      status: auth.status,
      headers: { 'content-type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // The client went away between the check and the write. Nothing to
          // do, and nothing worth logging on a mobile network.
        }
      };

      // Tell the browser how long to wait before reconnecting, and prove the
      // stream is alive straight away rather than after the first event —
      // otherwise a quiet shift is indistinguishable from a broken connection.
      send('retry: 5000\n\n');
      send(heartbeat());

      unsubscribe = subscribe((event: StaffEvent) => send(frame(event)));
      timer = setInterval(() => send(heartbeat()), HEARTBEAT_MS);

      // Without this, every disconnected crew device leaves a listener and an
      // interval behind for the life of the process.
      request.signal.addEventListener('abort', () => {
        unsubscribe?.();
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          // Already closed.
        }
      });
    },
    cancel() {
      unsubscribe?.();
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Belt and braces for proxies that buffer by default. The deployment's
      // Caddy vhost already sets `flush_interval -1`.
      'x-accel-buffering': 'no',
    },
  });
}
