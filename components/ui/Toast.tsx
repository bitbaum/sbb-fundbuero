'use client';

import { useEffect } from 'react';
import { config } from '@/lib/config';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  /** Duration in ms before auto-dismiss. Set to 0 to disable. Uses config default. */
  duration?: number;
}

const toastStyles = {
  success: 'bg-app-success',
  error: 'bg-brand',
  info: 'bg-app-blue',
};

const toastIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function Toast({
  message,
  type,
  onClose,
  duration = config.timing.toastDuration,
}: ToastProps) {
  useEffect(() => {
    if (duration === 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className={`toast animate-slide-up ${toastStyles[type]}`} role="alert" aria-live="polite">
      <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-lg">
        {toastIcons[type]}
      </span>
      <p className="flex-1 text-app-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="w-11 h-11 rounded-full hover:bg-white/10 flex items-center justify-center"
        aria-label="Schliessen"
      >
        ✕
      </button>
    </div>
  );
}
