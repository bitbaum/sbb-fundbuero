'use client';

import type { User } from '@/lib/types';
import { getGreeting } from '@/lib/labels';
import { tenant } from '@/lib/tenant';
import { UserIcon } from '@/components/ui/icons';

interface HeaderProps {
  user: User;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="header-app pb-8">
      <div className="flex justify-between items-center mb-5">
        <div className="text-[28px] font-black tracking-wide">{tenant.wordmark}</div>
        <button
          className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center"
          aria-label="Profil öffnen"
        >
          <UserIcon className="w-5 h-5" />
        </button>
      </div>
      <p className="text-2xl font-light mb-1">{getGreeting()}</p>
      <p className="text-app-base opacity-90">{user.name}</p>
    </header>
  );
}
