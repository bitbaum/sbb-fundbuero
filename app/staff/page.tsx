'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StaffHeader } from '@/components/staff/StaffHeader';
import { NotificationCard } from '@/components/staff/NotificationCard';
import { StaffStatusBar } from '@/components/staff/StaffStatusBar';
import type { StaffNotification, NotificationStatus } from '@/lib/types';
import { createDemoIncomingNotification, mockStaff, mockVehicle } from '@/lib/mock-data';
import { config } from '@/lib/config';
import { useDriverNotificationsApi } from '@/lib/hooks';
import { publishResponse, readReports, subscribeReports } from '@/lib/demo-bus';
import { UI_LABELS } from '@/lib/labels';

/** How an arriving report announces itself on a phone in a noisy train. */
function buzz() {
  if (typeof window !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]);
  }
}

export default function StaffPage() {
  // Notifications this view received locally — handed over from the passenger
  // view (lib/demo-bus) or, failing that, the staged demo one. Prepended ahead
  // of the fetched/mock list below.
  const [demoNotifications, setDemoNotifications] = useState<StaffNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  // The report to shout about, and the one to keep highlighted after the
  // visitor dismisses the alert.
  const [arrival, setArrival] = useState<StaffNotification | null>(null);
  const [arrivedId, setArrivedId] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const {
    data: fetchedNotifications,
    isLoading,
    updateNotification,
  } = useDriverNotificationsApi(mockVehicle.id);

  const notifications = [...demoNotifications, ...(fetchedNotifications ?? [])];

  const receive = useCallback((incoming: StaffNotification[], announce: boolean) => {
    const fresh = incoming.filter((n) => !seenIds.current.has(n.id));
    if (fresh.length === 0) return;

    fresh.forEach((n) => seenIds.current.add(n.id));
    // Prepend rather than replace: a notification already answered here keeps
    // the answer, and re-reading storage never resets it.
    setDemoNotifications((prev) => [...fresh, ...prev]);

    if (announce) {
      setArrival(fresh[0]);
      setArrivedId(fresh[0].id);
      buzz();
    }
  }, []);

  // Reports the passenger view handed over. Read after mount, not during
  // render: localStorage does not exist on the server, and a report already
  // sitting there is history, not an arrival — only what lands while the crew
  // is watching gets the alert.
  useEffect(() => {
    receive(readReports(), false);
    return subscribeReports((reports) => receive(reports, true));
  }, [receive]);

  // Nobody on a second device: stage one report so a visitor opening /staff
  // alone still sees an arrival. A real one always wins.
  useEffect(() => {
    if (!config.demo.autoNotify) return;

    const demoTimer = setTimeout(() => {
      if (seenIds.current.size > 0) return;
      receive([createDemoIncomingNotification()], true);
    }, config.timing.demoNotificationDelay);

    return () => clearTimeout(demoTimer);
  }, [receive]);

  const handleUpdateStatus = useCallback(
    async (notificationId: string, status: NotificationStatus, notes?: string) => {
      if (demoNotifications.some((n) => n.id === notificationId)) {
        setDemoNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? {
                  ...n,
                  status,
                  respondedAt: new Date().toISOString(),
                  response: notes ? { notes, foundItem: status === 'found' } : undefined,
                }
              : n,
          ),
        );

        // Tell the passenger. Ignored for the staged notification, which nobody
        // reported and which is therefore not in the handover — see demo-bus.
        if (status === 'found' || status === 'not_found') {
          publishResponse(notificationId, status, notes);
        }
        return;
      }

      if (status !== 'found' && status !== 'not_found') return;
      await updateNotification(notificationId, status, notes);
    },
    [demoNotifications, updateNotification],
  );

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pending') return n.status === 'pending' || n.status === 'acknowledged';
    return n.status === 'found' || n.status === 'not_found';
  });

  const pendingCount = notifications.filter(
    (n) => n.status === 'pending' || n.status === 'acknowledged',
  ).length;

  return (
    <div className="min-h-screen bg-app-milk">
      {/* Status Bar */}
      <StaffStatusBar vehicle={mockVehicle} pendingCount={pendingCount} isOnline={true} />

      {/* Header */}
      <StaffHeader staff={mockStaff} vehicle={mockVehicle} />

      {/* Filter Tabs */}
      <div className="sticky top-0 bg-white z-10 border-b border-app-cloud">
        <div className="flex px-4" role="tablist" aria-label="Meldungsfilter">
          {[
            { id: 'all', label: UI_LABELS.staff.tabAll, count: notifications.length },
            { id: 'pending', label: UI_LABELS.staff.tabOpen, count: pendingCount },
            {
              id: 'resolved',
              label: UI_LABELS.staff.tabResolved,
              count: notifications.length - pendingCount,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeFilter === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              onClick={() => setActiveFilter(tab.id as typeof activeFilter)}
              className={`
                flex-1 py-3 px-2 text-app-sm font-medium border-b-2 transition-colors
                ${
                  activeFilter === tab.id
                    ? 'text-brand border-brand'
                    : 'text-app-granite border-transparent hover:text-app-charcoal'
                }
              `}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`
                  ml-1.5 px-1.5 py-0.5 rounded-full text-app-xs
                  ${
                    activeFilter === tab.id
                      ? 'bg-brand text-white'
                      : 'bg-app-cloud text-app-granite'
                  }
                `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <main className="p-4 pb-20 space-y-3">
        {isLoading ? (
          // Loading skeletons
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-app p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-12 h-12 bg-app-cloud rounded-app-md" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-app-cloud rounded w-3/4" />
                    <div className="h-3 bg-app-cloud rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="text-5xl mb-4">{activeFilter === 'pending' ? '✅' : '📭'}</div>
            <h3 className="text-app-lg font-semibold text-app-charcoal mb-2">
              {activeFilter === 'pending'
                ? UI_LABELS.staff.noOpenReports
                : UI_LABELS.staff.noReports}
            </h3>
            <p className="text-app-sm text-app-granite">
              {activeFilter === 'pending'
                ? UI_LABELS.staff.allProcessed
                : UI_LABELS.staff.noLostReports}
            </p>
          </div>
        ) : (
          // Notification cards
          filteredNotifications.map((notification, index) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onUpdateStatus={handleUpdateStatus}
              isNew={notification.id === arrivedId && notification.status === 'pending'}
            />
          ))
        )}
      </main>

      {/* Incoming Notification Alert — the report that just arrived, not a script */}
      {arrival && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20 animate-fade-in">
          <div className="bg-white rounded-app-lg shadow-xl mx-4 max-w-sm w-full animate-slide-down overflow-hidden">
            <div className="bg-gradient-to-r from-brand to-brand-hover text-white p-4 text-center">
              <div className="text-4xl mb-2">🚨</div>
              <h3 className="text-lg font-semibold">{UI_LABELS.staff.newLostReport}</h3>
            </div>
            <div className="p-4">
              <p className="text-app-base text-app-charcoal font-medium mb-1">{arrival.message}</p>
              <p className="text-app-sm text-app-granite mb-4">
                {[arrival.location, arrival.passengerInfo?.tripRoute].filter(Boolean).join(' • ')}
              </p>
              <button onClick={() => setArrival(null)} className="btn-app-primary w-full">
                {UI_LABELS.staff.viewReport}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
