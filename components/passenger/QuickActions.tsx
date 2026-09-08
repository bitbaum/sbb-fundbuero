'use client';

import { QUICK_ACTIONS_CONFIG } from '@/lib/labels';

interface QuickActionsProps {
  onLostFound: () => void;
}

export function QuickActions({ onLostFound }: QuickActionsProps) {
  const handleClick = (actionId: string) => {
    if (actionId === 'lost-found') {
      onLostFound();
    }
    // Other actions would navigate to respective pages
  };

  return (
    <section className="px-6 py-6">
      <div className="grid grid-cols-2 gap-4">
        {QUICK_ACTIONS_CONFIG.map((action) => (
          <button
            key={action.id}
            onClick={() => handleClick(action.id)}
            className="card-app p-5 text-left touch-feedback group"
          >
            <div
              className={`
                w-12 h-12 rounded-app-md flex items-center justify-center text-2xl mb-3
                bg-gradient-to-br ${action.gradient}
              `}
            >
              {action.icon}
            </div>
            <h3 className="text-app-base font-semibold text-app-charcoal group-hover:text-brand transition-colors">
              {action.title}
            </h3>
            <p className="text-app-sm text-app-granite mt-1">{action.subtitle}</p>
            {'primary' in action && action.primary && (
              <span className="inline-block mt-2 text-app-xs text-brand font-medium">
                Sofort-Benachrichtigung →
              </span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}
