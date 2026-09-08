'use client';

import { useState } from 'react';
import type { StaffNotification, NotificationStatus, ItemCategory } from '@/lib/types';
import { ITEM_CATEGORY_CONFIG } from '@/lib/types';
import { formatRelativeTime } from '@/lib/mock-data';
import { config } from '@/lib/config';
import { NOTIFICATION_STATUS_CONFIG, UI_LABELS } from '@/lib/labels';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ChevronIcon, CheckIcon, XIcon } from '@/components/ui/icons';

interface NotificationCardProps {
  notification: StaffNotification;
  onUpdateStatus: (id: string, status: NotificationStatus, notes?: string) => Promise<void>;
  isNew?: boolean;
}

export function NotificationCard({ notification, onUpdateStatus, isNew }: NotificationCardProps) {
  const [isExpanded, setIsExpanded] = useState(notification.status === 'pending' || isNew);
  const [isResponding, setIsResponding] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');

  const categoryConfig = ITEM_CATEGORY_CONFIG[notification.category as ItemCategory];
  const isPending = notification.status === 'pending' || notification.status === 'acknowledged';

  const handleResponse = async (found: boolean) => {
    setIsResponding(true);
    await onUpdateStatus(
      notification.id,
      found ? 'found' : 'not_found',
      responseNotes || undefined,
    );
    setIsResponding(false);
    setIsExpanded(false);
  };

  const statusConfig = NOTIFICATION_STATUS_CONFIG[notification.status] || {
    label: notification.status,
    color: 'bg-app-cloud',
    textColor: 'text-app-charcoal',
  };

  return (
    <div
      className={`
        card-app overflow-hidden transition-all
        ${isNew ? 'ring-2 ring-brand animate-pulse-subtle' : ''}
        ${notification.priority === 'urgent' && isPending ? 'border-l-4 border-l-brand' : ''}
      `}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-4 flex items-start gap-3"
      >
        <div className="shrink-0 w-12 h-12 rounded-app-md bg-app-milk flex items-center justify-center text-2xl">
          {categoryConfig?.icon || '❓'}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-app-xs px-2 py-0.5 rounded-full font-medium ${statusConfig.color} ${statusConfig.textColor}`}
            >
              {statusConfig.label}
            </span>
            {notification.priority === 'urgent' && isPending && (
              <span className="text-app-xs text-brand font-medium">
                {UI_LABELS.lostItem.urgent}
              </span>
            )}
          </div>

          <h3 className="text-app-base font-semibold text-app-charcoal truncate">
            {notification.message}
          </h3>

          <p className="text-app-sm text-app-granite mt-0.5">{notification.location}</p>

          <p className="text-app-xs text-app-granite mt-1">
            {formatRelativeTime(notification.createdAt)}
            {notification.passengerInfo && ` • ${notification.passengerInfo.tripRoute}`}
          </p>
        </div>

        <ChevronIcon
          className={`w-5 h-5 text-app-granite transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-app-cloud px-4 pb-4">
          {/* Passenger Info */}
          {notification.passengerInfo && (
            <div className="bg-app-milk rounded-app-md p-3 mt-3 space-y-2">
              <h4 className="text-app-xs font-semibold text-app-granite uppercase tracking-wide">
                {UI_LABELS.staff.passengerInfo}
              </h4>
              <div className="grid grid-cols-2 gap-2 text-app-sm">
                <div>
                  <p className="text-app-granite text-app-xs">{UI_LABELS.staff.route}</p>
                  <p className="font-medium text-app-charcoal">
                    {notification.passengerInfo.tripRoute}
                  </p>
                </div>
                <div>
                  <p className="text-app-granite text-app-xs">{UI_LABELS.staff.time}</p>
                  <p className="font-medium text-app-charcoal">
                    {notification.passengerInfo.tripTime}
                  </p>
                </div>
                {notification.passengerInfo.seatInfo && (
                  <div className="col-span-2">
                    <p className="text-app-granite text-app-xs">{UI_LABELS.staff.position}</p>
                    <p className="font-medium text-app-charcoal">
                      {notification.passengerInfo.seatInfo}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Response Area for Pending */}
          {isPending && (
            <div className="mt-4 space-y-3">
              <textarea
                value={responseNotes}
                onChange={(e) => setResponseNotes(e.target.value)}
                placeholder={UI_LABELS.staff.optionalNote}
                className="input-app text-app-sm resize-none"
                rows={2}
                maxLength={config.validation.notes.maxLength}
              />

              <div className="flex gap-2">
                <button
                  onClick={() => handleResponse(true)}
                  disabled={isResponding}
                  className="flex-1 btn-app-primary flex items-center justify-center gap-2"
                >
                  {isResponding ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <CheckIcon className="w-5 h-5" />
                      {UI_LABELS.actions.found}
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleResponse(false)}
                  disabled={isResponding}
                  className="flex-1 btn-app-secondary flex items-center justify-center gap-2"
                >
                  {isResponding ? (
                    <LoadingSpinner />
                  ) : (
                    <>
                      <XIcon className="w-5 h-5" />
                      {UI_LABELS.actions.notFound}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Response Display for Resolved */}
          {!isPending && notification.response && (
            <div className="mt-3 bg-app-milk rounded-app-md p-3">
              <h4 className="text-app-xs font-semibold text-app-granite uppercase tracking-wide mb-2">
                {UI_LABELS.staff.yourResponse}
              </h4>
              {notification.response.notes && (
                <p className="text-app-sm text-app-charcoal">{notification.response.notes}</p>
              )}
              {notification.respondedAt && (
                <p className="text-app-xs text-app-granite mt-2">
                  {UI_LABELS.staff.answeredAt} {formatRelativeTime(notification.respondedAt)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
