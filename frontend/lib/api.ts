/**
 * API client for the Fundbüro backend
 *
 * SSOT for all API calls. Supports:
 * - Real backend when available
 * - Demo mode fallback to mock data
 * - WebSocket for real-time updates
 */

import { config } from './config';
import type {
  ApiResponse,
  LostItem,
  LostItemFormData,
  Trip,
  Notification,
  DriverNotification,
  NotificationStatus,
} from './types';

// ============================================================================
// Configuration
// ============================================================================

const DEMO_MODE = config.demo.enabled;
// Read through config, not a second process.env lookup. This line used to
// default to port 3003 while next.config.js defaulted the same variable to
// 3001 — one value, three definitions, two of them disagreeing.
const WS_URL = config.api.wsUrl;

// ============================================================================
// WebSocket Types
// ============================================================================

export type WebSocketEventType =
  'lost_item_created' | 'lost_item_status_updated' | 'driver_notification';

export interface WebSocketEvent {
  type: WebSocketEventType;
  data: unknown;
  timestamp: string;
}

export type WebSocketConnection = {
  close: () => void;
  send: (data: unknown) => void;
} | null;

// ============================================================================
// API Client
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private timeout: number;
  private wsConnection: WebSocket | null = null;

  constructor() {
    this.baseUrl = config.api.baseUrl;
    this.timeout = config.api.timeout;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    // Demo mode means no backend is reachable from this build, so there is
    // nothing to try. Firing the request anyway is not a harmless fallback: the
    // URL is inlined at build time, so in a deployed bundle it points at the
    // visitor's own machine. The caller sees the same shape a failed request
    // produces, so the existing mock fallback in useApiWithFallback is unchanged
    // — it just no longer needs a doomed round trip to trigger it.
    if (DEMO_MODE) {
      return { success: false, error: 'Demo mode: no backend configured' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Request failed' }));
        return { success: false, error: error.error || `HTTP ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { success: false, error: 'Request timeout' };
        }
        return { success: false, error: error.message };
      }
      return { success: false, error: 'Unknown error occurred' };
    }
  }

  // ============================================================================
  // Lost Items
  // ============================================================================

  async reportLostItem(data: LostItemFormData): Promise<ApiResponse<LostItem>> {
    return this.request<LostItem>('/api/lost-items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getLostItem(id: string): Promise<ApiResponse<LostItem>> {
    return this.request<LostItem>(`/api/lost-items/${id}`);
  }

  async getUserLostItems(userId: string): Promise<ApiResponse<LostItem[]>> {
    return this.request<LostItem[]>(`/api/lost-items?userId=${userId}`);
  }

  async updateLostItemStatus(
    id: string,
    status: string,
    message?: string,
  ): Promise<ApiResponse<LostItem>> {
    return this.request<LostItem>(`/api/lost-items/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, message }),
    });
  }

  // ============================================================================
  // Trips
  // ============================================================================

  async getRecentTrips(userId: string): Promise<ApiResponse<Trip[]>> {
    return this.request<Trip[]>(`/api/trips?userId=${userId}&status=completed&limit=10`);
  }

  async getCurrentTrip(userId: string): Promise<ApiResponse<Trip | null>> {
    return this.request<Trip | null>(`/api/trips/current?userId=${userId}`);
  }

  // ============================================================================
  // Notifications
  // ============================================================================

  async getNotifications(userId: string): Promise<ApiResponse<Notification[]>> {
    return this.request<Notification[]>(`/api/notifications?userId=${userId}`);
  }

  async markNotificationRead(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
    });
  }

  // ============================================================================
  // Driver Notifications
  // ============================================================================

  async getDriverNotifications(
    vehicleId: string,
    filter?: 'all' | 'pending' | 'resolved',
  ): Promise<ApiResponse<DriverNotification[]>> {
    const params = new URLSearchParams({ vehicleId });
    if (filter && filter !== 'all') {
      params.set('filter', filter);
    }
    return this.request<DriverNotification[]>(`/api/driver-notifications?${params.toString()}`);
  }

  async respondToNotification(
    notificationId: string,
    status: 'found' | 'not_found',
    notes?: string,
  ): Promise<ApiResponse<DriverNotification>> {
    return this.request<DriverNotification>(`/api/driver-notifications/${notificationId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ status, notes }),
    });
  }

  // ============================================================================
  // WebSocket Connection
  // ============================================================================

  connectWebSocket(
    onMessage: (event: WebSocketEvent) => void,
    onError?: (error: Event) => void,
    onConnect?: () => void,
    onDisconnect?: () => void,
  ): WebSocketConnection {
    if (typeof window === 'undefined') return null;
    // Same reason as request(): with no backend configured there is no socket
    // to open, and `new WebSocket('')` throws.
    if (DEMO_MODE || WS_URL === '') return null;

    try {
      this.wsConnection = new WebSocket(WS_URL);

      this.wsConnection.onopen = () => {
        console.log('WebSocket connected');
        onConnect?.();
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onerror = (error) => {
        console.error('WebSocket error:', error);
        onError?.(error);
      };

      this.wsConnection.onclose = () => {
        console.log('WebSocket disconnected');
        onDisconnect?.();
      };

      return {
        close: () => this.wsConnection?.close(),
        send: (data) => this.wsConnection?.send(JSON.stringify(data)),
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      return null;
    }
  }

  disconnectWebSocket(): void {
    this.wsConnection?.close();
    this.wsConnection = null;
  }

  // ============================================================================
  // Health Check
  // ============================================================================

  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.request<{ status: string }>('/health');
  }

  async checkAllServices(): Promise<{
    gateway: boolean;
    services: Record<string, boolean>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`);
      const data = await response.json();

      if (data.success && data.services) {
        return {
          gateway: true,
          services: Object.fromEntries(
            Object.entries(data.services).map(([name, status]) => [
              name,
              (status as { ok: boolean }).ok,
            ]),
          ),
        };
      }
      return { gateway: true, services: {} };
    } catch {
      return { gateway: false, services: {} };
    }
  }
}

export const api = new ApiClient();
