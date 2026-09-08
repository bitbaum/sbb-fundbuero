'use client';

import type { StaffMember, Vehicle } from '@/lib/types';
import { getGreeting, UI_LABELS } from '@/lib/labels';
import { VehicleIcon } from '@/components/ui/icons';

interface StaffHeaderProps {
  staff: StaffMember;
  vehicle: Vehicle;
}

export function StaffHeader({ staff, vehicle }: StaffHeaderProps) {
  const roleLabel = UI_LABELS.roles[staff.role] || staff.role;

  return (
    <header className="bg-brand text-white px-5 py-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-app-sm opacity-90 mb-1">{getGreeting()}</p>
          <h1 className="text-xl font-semibold">{staff.name}</h1>
          <p className="text-app-sm opacity-80 mt-1">
            {staff.employeeNumber} • {roleLabel}
          </p>
        </div>
        <div className="text-right">
          <div className="bg-white/20 rounded-app-md px-3 py-2">
            <VehicleIcon type={vehicle.type} className="w-5 h-5 mb-1 mx-auto" />
            <p className="text-app-xs font-medium">{vehicle.line}</p>
          </div>
        </div>
      </div>

      <div className="bg-white/10 rounded-app-md p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-xl">🔔</span>
        </div>
        <div>
          <p className="text-app-sm font-medium">{UI_LABELS.staff.notifications}</p>
          <p className="text-app-xs opacity-80">{UI_LABELS.staff.realtimeAlerts}</p>
        </div>
      </div>
    </header>
  );
}
