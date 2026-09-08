/**
 * Staff push, without a broker.
 *
 * REBUILD.md allows Socket.io "or Server-Sent Events, if it turns out to be
 * sufficient". It is, and the reasoning is worth keeping because the obvious
 * instinct is to reach for the socket library:
 *
 *   - the traffic is one-directional. The server tells crew about a new
 *     report; crew reply with ordinary POSTs. A duplex protocol buys nothing.
 *   - EventSource reconnects by itself, with an exponential backoff the
 *     browser owns. The deleted code hand-rolled that (1s, 2s, 4s, 8s, 16s,
 *     max 5 attempts) and then gave up permanently on the sixth failure —
 *     which, on a train, is a normal Tuesday.
 *   - it is plain HTTP, so it needs no separate port, no CORS, no upgrade
 *     handshake, and it already works through the deployment's Caddy vhost,
 *     which sets `flush_interval -1` on the reverse proxy.
 *   - one host, one process.
 *
 * THE LIMIT, stated rather than discovered later: this bus lives in the
 * process. Two app processes would each notify only their own subscribers.
 * That is fine for one systemd unit on one box, and it is the thing to change
 * first if that ever stops being true — at which point a broker earns its
 * place and not before.
 */

import { EventEmitter } from 'node:events';

export type StaffEventType =
  'report.submitted' | 'report.state_changed' | 'found_item.recorded' | 'match.proposed';

export interface StaffEvent {
  type: StaffEventType;
  /** Never personal data. This goes to every connected crew device. */
  payload: Record<string, unknown>;
  at: string;
}

declare global {
  // `var` is required here: `let`/`const` in a global declaration do not
  // attach to globalThis, which is the whole point of this block.
  // eslint-disable-next-line no-var, vars-on-top
  var __fundbueroBus: EventEmitter | undefined;
}

function bus(): EventEmitter {
  if (!globalThis.__fundbueroBus) {
    const emitter = new EventEmitter();
    // A busy shift is dozens of crew devices, not ten. The default limit of 10
    // would print a misleading "possible memory leak" warning at exactly the
    // moment the product is working.
    emitter.setMaxListeners(0);
    globalThis.__fundbueroBus = emitter;
  }
  return globalThis.__fundbueroBus;
}

export function publish(type: StaffEventType, payload: Record<string, unknown>): void {
  const event: StaffEvent = { type, payload, at: new Date().toISOString() };
  bus().emit('staff', event);
}

export function subscribe(listener: (event: StaffEvent) => void): () => void {
  bus().on('staff', listener);
  return () => bus().off('staff', listener);
}

/** Serialise one event as an SSE frame. */
export function frame(event: StaffEvent): string {
  // `event:` lets the client listen per type; `data:` must not contain a raw
  // newline, which JSON.stringify guarantees.
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * A comment frame, sent periodically.
 *
 * Not decoration: proxies and mobile networks close a connection that has been
 * silent for a while, and on a quiet night shift nothing else would be sent
 * for hours. A colon-prefixed line is an SSE comment — the browser ignores it,
 * and the connection stays open.
 */
export function heartbeat(): string {
  return `: keep-alive ${new Date().toISOString()}\n\n`;
}
