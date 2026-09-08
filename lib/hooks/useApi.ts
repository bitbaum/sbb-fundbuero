'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { config } from '../config';
import type { Trip, DriverNotification, LostItem } from '../types';
import { mockTrips, mockStaffNotifications, mockActiveTrip } from '../mock-data';

interface UseApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook that tries API first, falls back to mock data if API unavailable.
 * This allows the app to work both with and without backend.
 */
export function useApiWithFallback<T>(
  apiFn: () => Promise<{ success: boolean; data?: T; error?: string }>,
  mockData: T,
  deps: unknown[] = [],
): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    isLoading: true,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await apiFn();

      if (response.success && response.data) {
        setState({ data: response.data, isLoading: false, error: null });
      } else {
        // API returned error, use mock data
        console.log('API unavailable, using mock data');
        setState({ data: mockData, isLoading: false, error: null });
      }
    } catch (error) {
      // Network error, use mock data
      console.log('API error, using mock data:', error);
      setState({ data: mockData, isLoading: false, error: null });
    }
  }, [apiFn, mockData]);

  useEffect(() => {
    // Justified disable, not a silenced bug. `set-state-in-effect` exists to
    // catch state DERIVED during render that was pushed into an effect; this is
    // the other case the rule's own docs call legitimate — loading from an
    // external system. What the rule sees is fetchData's first statement, a
    // synchronous setState flipping isLoading, and there is no way to express
    // "fetch on mount" without it. The rule stays on so a genuine
    // derived-state-in-effect still fails here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, deps);

  return { ...state, refetch: fetchData };
}

/**
 * Hook for fetching trips with mock fallback.
 */
export function useTrips(): UseApiState<Trip[]> & { refetch: () => void } {
  return useApiWithFallback(
    async () => {
      const response = await api.getRecentTrips('demo-user');
      return response;
    },
    mockTrips,
    [],
  );
}

/**
 * Hook for current/active trip with mock fallback.
 */
export function useCurrentTrip(): UseApiState<Trip | null> & { refetch: () => void } {
  return useApiWithFallback(
    async () => {
      const response = await api.getCurrentTrip('demo-user');
      return response;
    },
    mockActiveTrip,
    [],
  );
}

/**
 * Hook for driver notifications with mock fallback.
 */
export function useDriverNotificationsApi(
  vehicleId: string,
  filter?: 'all' | 'pending' | 'resolved',
): UseApiState<DriverNotification[]> & {
  refetch: () => void;
  updateNotification: (id: string, status: 'found' | 'not_found', notes?: string) => Promise<void>;
} {
  const [localData, setLocalData] = useState<DriverNotification[] | null>(null);

  const baseState = useApiWithFallback(
    async () => {
      const response = await api.getDriverNotifications(vehicleId, filter);
      return response;
    },
    mockStaffNotifications,
    [vehicleId, filter],
  );

  // Use local data if we've made local updates
  const data = localData ?? baseState.data;

  const updateNotification = useCallback(
    async (id: string, status: 'found' | 'not_found', notes?: string) => {
      // Optimistic update. `prev` is localData, which starts out null until this
      // runs once — fall back to the fetched/mock list so the first response
      // actually applies instead of updating nothing.
      setLocalData((prev) => {
        const base = prev ?? baseState.data;
        if (!base) return prev;
        return base.map((n) =>
          n.id === id
            ? {
                ...n,
                status,
                respondedAt: new Date().toISOString(),
                response: notes ? { notes, foundItem: status === 'found' } : undefined,
              }
            : n,
        );
      });

      // Try API call
      try {
        await api.respondToNotification(id, status, notes);
      } catch (error) {
        console.log('API update failed, keeping local state');
      }
    },
    [baseState.data],
  );

  return {
    ...baseState,
    data,
    updateNotification,
  };
}

/**
 * Hook for reporting a lost item.
 */
export function useReportLostItem() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reportItem = useCallback(
    async (data: {
      tripId: string;
      category: string;
      description: string;
      location: string;
      locationDetail?: string;
    }): Promise<{ success: boolean; item?: LostItem }> => {
      setIsSubmitting(true);
      setError(null);

      try {
        const response = await api.reportLostItem({
          tripId: data.tripId,
          category: data.category as any,
          description: data.description,
          location: data.location as any,
          locationDetail: data.locationDetail,
        });

        if (response.success && response.data) {
          setIsSubmitting(false);
          return { success: true, item: response.data };
        }

        // API failed but we still want to show success in demo mode
        console.log('API report failed, simulating success for demo');
        setIsSubmitting(false);
        return { success: true };
      } catch (error) {
        console.log('Report API error, simulating success for demo');
        setIsSubmitting(false);
        return { success: true };
      }
    },
    [],
  );

  return {
    reportItem,
    isSubmitting,
    error,
  };
}

/**
 * Hook for checking API health status.
 */
export function useApiHealth() {
  const [status, setStatus] = useState<{
    checked: boolean;
    available: boolean;
    services: Record<string, boolean>;
  }>({
    checked: false,
    available: false,
    services: {},
  });

  useEffect(() => {
    async function checkHealth() {
      try {
        const result = await api.checkAllServices();
        setStatus({
          checked: true,
          available: result.gateway,
          services: result.services,
        });
      } catch {
        setStatus({
          checked: true,
          available: false,
          services: {},
        });
      }
    }

    checkHealth();
  }, []);

  return status;
}
