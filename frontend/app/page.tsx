'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBar } from '@/components/ui/StatusBar';
import { Header } from '@/components/passenger/Header';
import { TripCard } from '@/components/passenger/TripCard';
import { LostItemModal } from '@/components/passenger/LostItemModal';
import { MyReports } from '@/components/passenger/MyReports';
import { BottomNav, type NavTab } from '@/components/ui/BottomNav';
import { Toast } from '@/components/ui/Toast';
import { mockUser, formatRelativeTime } from '@/lib/mock-data';
import { config } from '@/lib/config';
import { useCurrentTrip, useTrips } from '@/lib/hooks';
import { readReports, subscribeReports } from '@/lib/demo-bus';
import { UI_LABELS } from '@/lib/labels';
import type { Trip, LostItem, StaffNotification } from '@/lib/types';

// Tab content components
function PlanenTab() {
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-white rounded-app-lg p-4 shadow-app-card mb-4">
        <h2 className="text-app-lg font-semibold text-app-charcoal mb-3">Verbindung suchen</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-app-milk rounded-app-md">
            <div className="w-2 h-2 rounded-full bg-app-success" />
            <input
              type="text"
              placeholder="Von"
              className="flex-1 bg-transparent text-app-base outline-none"
            />
          </div>
          <div className="flex items-center gap-3 p-3 bg-app-milk rounded-app-md">
            <div className="w-2 h-2 rounded-full bg-brand" />
            <input
              type="text"
              placeholder="Nach"
              className="flex-1 bg-transparent text-app-base outline-none"
            />
          </div>
        </div>
        <button className="w-full mt-4 bg-brand text-white py-3 rounded-app-md font-medium">
          Verbindung suchen
        </button>
      </div>
      <p className="text-app-sm text-app-granite text-center">
        Demo: Planen-Tab (Verbindungssuche)
      </p>
    </div>
  );
}

function EasyRideTab() {
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-white rounded-app-lg p-6 shadow-app-card text-center">
        <div className="w-16 h-16 bg-app-milk rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎫</span>
        </div>
        <h2 className="text-app-lg font-semibold text-app-charcoal mb-2">EasyRide</h2>
        <p className="text-app-sm text-app-granite mb-4">
          Check-in, reisen, Check-out. Der Fahrpreis wird automatisch berechnet.
        </p>
        <button className="w-full bg-brand text-white py-3 rounded-app-md font-medium">
          EasyRide starten
        </button>
      </div>
      <p className="text-app-sm text-app-granite text-center mt-4">Demo: EasyRide-Tab</p>
    </div>
  );
}

function BilletteTab() {
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-white rounded-app-lg p-4 shadow-app-card mb-4">
        <h2 className="text-app-lg font-semibold text-app-charcoal mb-3">Meine Billette</h2>
        <div className="flex gap-2 mb-4">
          <button className="flex-1 py-2 px-3 bg-brand text-white rounded-app-md text-app-sm font-medium">
            Gültig
          </button>
          <button className="flex-1 py-2 px-3 bg-app-milk text-app-granite rounded-app-md text-app-sm font-medium">
            Abgelaufen
          </button>
        </div>
        <div className="text-center py-8">
          <span className="text-4xl mb-2 block">🎫</span>
          <p className="text-app-sm text-app-granite">Keine aktiven Billette</p>
        </div>
      </div>
      <p className="text-app-sm text-app-granite text-center">Demo: Billette & Abos Tab</p>
    </div>
  );
}

function ShopTab() {
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-white rounded-app-lg p-4 shadow-app-card mb-4">
        <h2 className="text-app-lg font-semibold text-app-charcoal mb-3">Shop & Services</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: '🎫', label: 'Tageskarten' },
            { icon: '🚲', label: 'Velo-Tageskarte' },
            { icon: '🐕', label: 'Hunde-Tageskarte' },
            { icon: '🔍', label: 'Fundservice' },
          ].map((item) => (
            <div key={item.label} className="p-4 bg-app-milk rounded-app-md text-center">
              <span className="text-2xl mb-2 block">{item.icon}</span>
              <span className="text-app-sm text-app-charcoal">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-app-sm text-app-granite text-center">Demo: Shop & Services Tab</p>
    </div>
  );
}

interface ProfilTabProps {
  onOpenFundservice?: () => void;
}

function ProfilTab({ onOpenFundservice }: ProfilTabProps) {
  const user = mockUser;
  return (
    <div className="px-4 pt-4 pb-6">
      <div className="bg-white rounded-app-lg p-4 shadow-app-card mb-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-app-milk rounded-full flex items-center justify-center">
            <span className="text-2xl">👤</span>
          </div>
          <div>
            <h2 className="text-app-lg font-semibold text-app-charcoal">{user.name}</h2>
            <p className="text-app-sm text-app-granite">{user.swissPassId || 'SwissPass'}</p>
          </div>
        </div>
        <div className="space-y-2">
          {/* Fundservice - Lost & Found */}
          {onOpenFundservice && (
            <button
              onClick={onOpenFundservice}
              className="w-full p-3 bg-brand-surface rounded-app-md flex items-center gap-3 hover:bg-brand-surface-hover transition-colors"
            >
              <span className="text-xl">🧳</span>
              <div className="flex-1 text-left">
                <span className="text-app-base font-medium text-brand">Fundservice</span>
                <p className="text-app-xs text-app-granite">Verlust melden oder Status prüfen</p>
              </div>
              <span className="text-brand">›</span>
            </button>
          )}
          {[
            'Persönliche Daten',
            'Zahlungsmittel',
            'Benachrichtigungen',
            'Einstellungen',
            'Hilfe & Kontakt',
          ].map((item) => (
            <div
              key={item}
              className="p-3 bg-app-milk rounded-app-md flex justify-between items-center"
            >
              <span className="text-app-base text-app-charcoal">{item}</span>
              <span className="text-app-granite">›</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-app-sm text-app-granite text-center">Demo: Profil-Tab</p>
    </div>
  );
}

export default function PassengerApp() {
  const [showLostModal, setShowLostModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [activeTab, setActiveTab] = useState<NavTab>('reisen');
  // Answers already announced, so a re-read never repeats a toast.
  const announcedIds = useRef<Set<string>>(new Set());
  const { data: currentTrip, isLoading: isLoadingCurrentTrip } = useCurrentTrip();
  const { data: recentTripsData, isLoading: isLoadingTrips } = useTrips();
  const recentTrips = recentTripsData ?? [];
  const isLoading = isLoadingCurrentTrip || isLoadingTrips;

  const handleReportLost = useCallback((trip: Trip) => {
    setSelectedTrip(trip);
    setShowLostModal(true);
  }, []);

  const handleSubmitReport = useCallback((item: LostItem) => {
    setShowLostModal(false);
    setToast({
      message: UI_LABELS.lostItem.driverNotifiedMessage,
      type: 'success',
    });

    // The crew is looking — the plausible next beat while nobody has answered
    // yet. It must never talk over a real answer, so it stands down once one
    // is in: with two devices on the demo, the crew can answer inside these
    // few seconds.
    setTimeout(() => {
      const answered = readReports().find((n) => n.lostItemId === item.id)?.respondedAt;
      if (answered) return;
      setToast({
        message: UI_LABELS.lostItem.staffSearching,
        type: 'info',
      });
    }, config.timing.demoNotificationDelay);
  }, []);

  // What the crew answered, told to the passenger — the last hop of the flow
  // this demo exists to show. Answers already sitting in storage are history,
  // not news: they seed the seen set on mount so a reload stays quiet.
  useEffect(() => {
    const announce = (reports: StaffNotification[], onMount: boolean) => {
      const answered = reports.filter((n) => n.respondedAt && !announcedIds.current.has(n.id));
      answered.forEach((n) => announcedIds.current.add(n.id));
      if (onMount || answered.length === 0) return;

      const found = answered[0].status === 'found';
      setToast({
        message: found ? UI_LABELS.lostItem.itemFound : UI_LABELS.lostItem.itemNotFound,
        type: found ? 'success' : 'info',
      });
    };

    announce(readReports(), true);
    return subscribeReports((reports) => announce(reports, false));
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowLostModal(false);
    setSelectedTrip(null);
  }, []);

  // Render loading skeleton for Reisen tab
  const renderLoadingSkeleton = () => (
    <div className="px-4 pt-4">
      {/* Active trip skeleton */}
      <div className="bg-app-cloud rounded-app-lg p-5 mb-4 animate-pulse">
        <div className="h-4 bg-app-silver rounded w-1/3 mb-4" />
        <div className="h-6 bg-app-silver rounded w-2/3 mb-2" />
        <div className="h-4 bg-app-silver rounded w-1/2 mb-4" />
        <div className="h-12 bg-app-silver rounded" />
      </div>

      {/* Recent trips skeleton */}
      <div className="h-5 bg-app-cloud rounded w-1/3 mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-app-lg p-4 animate-pulse shadow-app-card">
            <div className="flex gap-3">
              <div className="w-4 h-4 bg-app-cloud rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-app-cloud rounded w-3/4" />
                <div className="h-3 bg-app-cloud rounded w-1/2" />
              </div>
              <div className="w-16 h-8 bg-app-cloud rounded-app-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // Render the Reisen (Trips) tab content
  const renderReisenTab = () => {
    if (isLoading) {
      return renderLoadingSkeleton();
    }

    return (
      <div className="px-4 pt-4 pb-6">
        {/* Current Journey (if active) - no lost button here, user is on the train */}
        {currentTrip && currentTrip.status === 'active' && (
          <section className="mb-4">
            <TripCard trip={currentTrip} variant="active" />
          </section>
        )}

        {/* Einzelreisen (Individual Trips) Section - past trips */}
        <section>
          <h2 className="text-app-sm font-medium text-app-granite mb-3">Letzte Reisen</h2>
          <div className="space-y-2">
            {recentTrips.slice(0, 5).map((trip, index) => (
              <TripCard
                key={trip.id}
                trip={trip}
                variant="compact"
                // Only show lost button on most recent trip (index 0)
                onReportLost={index === 0 ? () => handleReportLost(trip) : undefined}
                timeAgo={formatRelativeTime(trip.arrivalTime)}
              />
            ))}
          </div>
        </section>

        {/* What this passenger reported, and how each one ended */}
        <MyReports />
      </div>
    );
  };

  // Render current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'planen':
        return <PlanenTab />;
      case 'reisen':
        return renderReisenTab();
      case 'easyride':
        return <EasyRideTab />;
      case 'billette':
        return <BilletteTab />;
      case 'shop':
        return <ShopTab />;
      case 'profil':
        return (
          <ProfilTab
            onOpenFundservice={() => {
              // Open lost item modal with most recent trip
              if (recentTrips.length > 0) {
                handleReportLost(recentTrips[0]);
              }
            }}
          />
        );
      default:
        return renderReisenTab();
    }
  };

  return (
    <>
      {/* iOS Status Bar */}
      <StatusBar />

      {/* Operator header */}
      <Header user={mockUser} />

      {/* Main Content */}
      <main className="pb-20 overflow-y-auto hide-scrollbar bg-app-milk min-h-[calc(100vh-120px)]">
        {renderTabContent()}
      </main>

      {/* Bottom Navigation - 6 tabs, mirroring a typical operator app */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Lost Item Modal */}
      {showLostModal && (
        <LostItemModal
          trip={selectedTrip || recentTrips[0]}
          onClose={handleCloseModal}
          onSubmit={handleSubmitReport}
        />
      )}

      {/* Toast Notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}
