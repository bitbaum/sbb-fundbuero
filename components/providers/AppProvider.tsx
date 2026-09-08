'use client';

import { ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface AppProviderProps {
  children: ReactNode;
}

/**
 * App Provider - Wraps app with error boundary and future providers
 * (e.g., theme, auth, toast context)
 */
export function AppProvider({ children }: AppProviderProps) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
