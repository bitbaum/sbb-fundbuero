/**
 * UI Labels Configuration
 * SSOT for all user-facing text
 *
 * Following SSOT principle: all labels defined here, imported where needed.
 * This enables future i18n without changing component code.
 */

// ============================================================================
// Notification Status Labels
// ============================================================================

export const NOTIFICATION_STATUS_CONFIG = {
  pending: {
    label: 'Neu',
    color: 'bg-brand',
    textColor: 'text-white',
  },
  acknowledged: {
    // White on amber was 2.15:1 — the worst contrast in the app, and on the
    // one badge a passenger sees while still hoping. Amber is too light to
    // carry white text at any usable saturation, so the text goes dark
    // instead: charcoal on --app-warning is 8.49:1. Also drops the raw
    // Tailwind `amber-500`, which was the only palette colour in this file
    // that did not come from the token SSOT.
    label: 'In Bearbeitung',
    color: 'bg-app-warning',
    textColor: 'text-app-charcoal',
  },
  found: {
    label: 'Gefunden',
    color: 'bg-app-success',
    textColor: 'text-white',
  },
  not_found: {
    label: 'Nicht gefunden',
    color: 'bg-app-granite',
    textColor: 'text-white',
  },
} as const;

// ============================================================================
// Quick Actions Config
// ============================================================================

export const QUICK_ACTIONS_CONFIG = [
  {
    id: 'lost-found',
    title: 'Lost & Found',
    subtitle: 'Verlust sofort melden',
    icon: '🧳',
    gradient: 'from-brand to-brand-hover',
    primary: true,
  },
  {
    id: 'tickets',
    title: 'Tickets kaufen',
    subtitle: 'Schneller Ticketkauf',
    icon: '🎫',
    gradient: 'from-app-blue to-app-blue',
  },
  {
    id: 'tracking',
    title: 'Live Tracking',
    subtitle: 'Reise verfolgen',
    icon: '📍',
    gradient: 'from-app-warning to-app-warning',
  },
  {
    id: 'info',
    title: 'Reise-Info',
    subtitle: 'Verspätungen & Updates',
    icon: 'ℹ️',
    gradient: 'from-app-success to-app-success',
  },
] as const;

// ============================================================================
// Common UI Labels
// ============================================================================

export const UI_LABELS = {
  // Navigation (mobile app tabs)
  navigation: {
    planen: 'Planen',
    reisen: 'Reisen',
    easyride: 'EasyRide',
    billette: 'Billette',
    shop: 'Shop',
    profil: 'Profil',
  },

  // Greetings
  greetings: {
    morning: 'Guten Morgen',
    afternoon: 'Guten Tag',
    evening: 'Guten Abend',
  },

  // Staff roles
  roles: {
    driver: 'Lokführer',
    conductor: 'Zugbegleiter',
    controller: 'Kontrolleur',
    cleaner: 'Reinigung',
    staff: 'Personal',
  },

  // Actions
  actions: {
    found: 'Gefunden',
    notFound: 'Nicht gefunden',
    submit: 'Senden',
    cancel: 'Abbrechen',
    back: 'Zurück',
    close: 'Schliessen',
    understood: 'Verstanden',
    reportLoss: 'Verlust?',
    reportUrgent: '🚨 Melden',
    lostSomething: 'Etwas verloren?',
  },

  // Status
  status: {
    online: 'Online',
    offline: 'Offline',
    open: 'offen',
    all: 'Alle',
    resolved: 'Erledigt',
  },

  // Trip
  trip: {
    currentTrip: 'Aktuelle Reise',
    recentTrips: 'Letzte Reisen',
    arrival: 'Ankunft',
    car: 'Wagen',
    seat: 'Platz',
  },

  // Lost item flow
  lostItem: {
    reportTitle: 'Verlust melden',
    whatLost: 'Was haben Sie verloren?',
    whereExactly: 'Wo genau?',
    description: 'Beschreibung',
    affectedTrip: 'Betroffene Reise',
    notifyDriver: 'Personal sofort benachrichtigen',
    driverNotified: 'Personal benachrichtigt!',
    driverNotifiedMessage: 'Personal wurde sofort benachrichtigt!',
    staffSearching: 'Personal sucht aktiv nach Ihrem Gegenstand',
    itemFound: 'Gefunden! Das Personal hat Ihren Gegenstand.',
    itemNotFound: 'Personal konnte den Gegenstand nicht finden — Ihre Meldung geht ans Fundbüro.',
    urgent: 'Dringend',
    actFast: 'Schnell handeln!',
    sending: 'Wird gesendet...',
    instantNotification: 'Sofort-Benachrichtigung →',
    successTitle: 'Personal benachrichtigt!',
    successMessage:
      'Das Zugpersonal wurde sofort informiert und wird bei der nächsten Gelegenheit nach Ihrem Gegenstand suchen.',
    nextSteps: 'Nächste Schritte',
    pushNotification: 'Sie werden per Push benachrichtigt',
    step1: 'Personal prüft bei Endstation',
    step2: 'Status-Update in der App',
    step3: 'Abholung koordinieren',
  },

  // The passenger's own reports and how each one ended
  myReports: {
    title: 'Meine Verlustmeldungen',
    staffNote: 'Rückmeldung des Personals',
    reportedAt: 'Gemeldet',
  },

  // Time
  time: {
    justNow: 'gerade eben',
    minutesAgo: (n: number) => `vor ${n} Min.`,
    hoursAgo: (n: number) => `vor ${n} Std.`,
    daysAgo: (n: number) => `vor ${n} Tag${n > 1 ? 'en' : ''}`,
    trainStoppedAgo: (n: number) => `Ihr Zug hat vor ${n} Minuten angehalten.`,
    staffCanSearch: ' Personal kann jetzt noch suchen!',
    fasterBetterChances: ' Je schneller Sie melden, desto besser die Chancen.',
  },

  // Staff interface (employees: drivers, conductors, controllers, etc.)
  staff: {
    notifications: 'Verlustmeldungen',
    realtimeAlerts: 'Echtzeitbenachrichtigungen für Ihren Zug',
    passengerInfo: 'Angaben des Fahrgastes',
    route: 'Strecke',
    time: 'Zeit',
    position: 'Position',
    yourResponse: 'Ihre Rückmeldung',
    answeredAt: 'Beantwortet',
    optionalNote: 'Optionale Notiz (z.B. wo gefunden, Zustand)...',
    // Tab filters
    tabAll: 'Alle',
    tabOpen: 'Offen',
    tabResolved: 'Erledigt',
    // Empty states
    noOpenReports: 'Keine offenen Meldungen',
    noReports: 'Keine Meldungen',
    allProcessed: 'Alle Meldungen wurden bearbeitet.',
    noLostReports: 'Es liegen keine Verlustmeldungen vor.',
    // New notification alert
    newLostReport: 'Neue Verlustmeldung!',
    viewReport: 'Meldung ansehen',
  },

  // Accessibility
  a11y: {
    openProfile: 'Profil öffnen',
    closeModal: 'Schliessen',
    reportLossFor: (origin: string, dest: string) =>
      `Verlust melden für Reise ${origin} nach ${dest}`,
  },
} as const;

// ============================================================================
// Helper function for greeting based on time
// ============================================================================

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return UI_LABELS.greetings.morning;
  if (hour < 18) return UI_LABELS.greetings.afternoon;
  return UI_LABELS.greetings.evening;
}
