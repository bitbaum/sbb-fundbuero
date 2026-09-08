'use client';

import type { Vehicle } from '@/lib/types';
import { UI_LABELS } from '@/lib/labels';

interface StaffStatusBarProps {
  vehicle: Vehicle;
  pendingCount: number;
  isOnline: boolean;
}

export function StaffStatusBar({ vehicle, pendingCount, isOnline }: StaffStatusBarProps) {
  return (
    <div className="bg-app-charcoal text-white px-4 py-2 flex items-center justify-between text-app-xs">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-app-success' : 'bg-app-smoke'}`} />
        <span className="opacity-80">
          {isOnline ? UI_LABELS.status.online : UI_LABELS.status.offline}
        </span>
      </div>
      <div className="font-medium">{vehicle.number}</div>
      <div className="flex items-center gap-1.5">
        {pendingCount > 0 && (
          <span className="bg-brand px-1.5 py-0.5 rounded-full text-white font-medium">
            {pendingCount}
          </span>
        )}
        <span className="opacity-80">{UI_LABELS.status.open}</span>
      </div>
    </div>
  );
}
