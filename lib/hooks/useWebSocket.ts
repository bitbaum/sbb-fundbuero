'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { api, WebSocketEvent, WebSocketConnection } from '../api';

interface UseWebSocketOptions {
  onMessage?: (event: WebSocketEvent) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  autoConnect?: boolean;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  lastEvent: WebSocketEvent | null;
  connect: () => void;
  disconnect: () => void;
  send: (data: unknown) => void;
}

/**
 * React hook for WebSocket connection to notification service.
 * Provides real-time updates for lost item status changes and driver notifications.
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { onMessage, onConnect, onDisconnect, onError, autoConnect = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WebSocketEvent | null>(null);
  const connectionRef = useRef<WebSocketConnection>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // `handleDisconnect` schedules a reconnect by calling `connect`, and `connect`
  // lists `handleDisconnect` as a dependency — a genuine cycle. It used to be
  // resolved by declaring `handleDisconnect` first and omitting `connect` from
  // its dependency list, which trades a lint error for a staleness bug:
  // `handleDisconnect` is memoised on [autoConnect, onDisconnect], so it keeps
  // calling whichever `connect` existed when it was created. Once the handlers
  // change identity, a reconnect rewires the socket to the PREVIOUS render's
  // callbacks — messages then arrive at a stale onMessage.
  //
  // Reading `connect` through a ref breaks the cycle honestly: the ref is
  // repointed whenever `connect` changes, so the reconnect path always reaches
  // the current one and no dependency has to be hidden from the linter.
  const connectRef = useRef<() => void>(() => {});

  const handleMessage = useCallback(
    (event: WebSocketEvent) => {
      setLastEvent(event);
      onMessage?.(event);
    },
    [onMessage],
  );

  const handleConnect = useCallback(() => {
    setIsConnected(true);
    reconnectAttemptsRef.current = 0;
    onConnect?.();
  }, [onConnect]);

  const handleDisconnect = useCallback(() => {
    setIsConnected(false);
    onDisconnect?.();

    // Auto-reconnect with exponential backoff
    if (autoConnect && reconnectAttemptsRef.current < 5) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connectRef.current();
      }, delay);
    }
  }, [autoConnect, onDisconnect]);

  const handleError = useCallback(
    (error: Event) => {
      console.error('WebSocket error:', error);
      onError?.(error);
    },
    [onError],
  );

  const connect = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.close();
    }

    connectionRef.current = api.connectWebSocket(
      handleMessage,
      handleError,
      handleConnect,
      handleDisconnect,
    );
  }, [handleMessage, handleError, handleConnect, handleDisconnect]);

  // Declared BEFORE the auto-connect effect on purpose: effects run in
  // declaration order on mount, so the ref points at the real `connect` before
  // anything can call it.
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = 5; // Prevent auto-reconnect
    connectionRef.current?.close();
    connectionRef.current = null;
    setIsConnected(false);
  }, []);

  const send = useCallback((data: unknown) => {
    connectionRef.current?.send(data);
  }, []);

  // Auto-connect on mount. Goes through the ref so this effect does not have to
  // depend on `connect` (which changes whenever any handler prop does, and would
  // otherwise tear the socket down and rebuild it on every such render).
  // `disconnect` is memoised on [] and therefore stable, so depending on it is
  // honest rather than a hidden omission.
  useEffect(() => {
    if (autoConnect) {
      connectRef.current();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, disconnect]);

  return {
    isConnected,
    lastEvent,
    connect,
    disconnect,
    send,
  };
}

/**
 * Hook specifically for driver notifications.
 * Filters WebSocket events to only handle driver-relevant notifications.
 */
export function useDriverNotifications(onNewNotification?: (notification: unknown) => void) {
  const handleMessage = useCallback(
    (event: WebSocketEvent) => {
      if (event.type === 'driver_notification' || event.type === 'lost_item_created') {
        onNewNotification?.(event.data);
      }
    },
    [onNewNotification],
  );

  return useWebSocket({
    onMessage: handleMessage,
  });
}

/**
 * Hook for passenger status updates.
 * Filters WebSocket events to only handle status changes for reported items.
 */
export function useItemStatusUpdates(
  itemIds: string[],
  onStatusChange?: (itemId: string, status: string) => void,
) {
  const handleMessage = useCallback(
    (event: WebSocketEvent) => {
      if (event.type === 'lost_item_status_updated') {
        const data = event.data as { itemId?: string; lostItemId?: string; status?: string };
        const itemId = data.itemId || data.lostItemId;
        if (itemId && itemIds.includes(itemId) && data.status) {
          onStatusChange?.(itemId, data.status);
        }
      }
    },
    [itemIds, onStatusChange],
  );

  return useWebSocket({
    onMessage: handleMessage,
  });
}
