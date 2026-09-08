'use client';

import {
  PlanenIcon,
  ReisenIcon,
  EasyRideIcon,
  BilletteIcon,
  ShopIcon,
  ProfilIcon,
} from '@/components/ui/icons';
import { UI_LABELS } from '@/lib/labels';

export type NavTab = 'planen' | 'reisen' | 'easyride' | 'billette' | 'shop' | 'profil';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'planen', label: UI_LABELS.navigation.planen, icon: PlanenIcon },
  { id: 'reisen', label: UI_LABELS.navigation.reisen, icon: ReisenIcon },
  { id: 'easyride', label: UI_LABELS.navigation.easyride, icon: EasyRideIcon },
  { id: 'billette', label: UI_LABELS.navigation.billette, icon: BilletteIcon },
  { id: 'shop', label: UI_LABELS.navigation.shop, icon: ShopIcon },
  { id: 'profil', label: UI_LABELS.navigation.profil, icon: ProfilIcon },
];

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Hauptnavigation">
      {navItems.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className={`
            flex-1 flex flex-col items-center py-2 px-0.5 min-w-0
            transition-colors duration-200
            ${activeTab === id ? 'text-brand' : 'text-app-granite hover:text-app-iron'}
          `}
          aria-current={activeTab === id ? 'page' : undefined}
        >
          <Icon className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] font-medium truncate w-full text-center">{label}</span>
        </button>
      ))}
    </nav>
  );
}
