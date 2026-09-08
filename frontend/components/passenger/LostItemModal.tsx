'use client';

import { useState, useCallback } from 'react';
import type { Trip, LostItem, ItemCategory, ItemLocation } from '@/lib/types';
import {
  ITEM_CATEGORY_CONFIG,
  ITEM_LOCATION_CONFIG,
  ITEM_CATEGORIES,
  ITEM_LOCATIONS,
} from '@/lib/types';
import { formatTime, getTimeSinceTrip } from '@/lib/mock-data';
import { config } from '@/lib/config';
import { useReportLostItem } from '@/lib/hooks';
import { publishReport } from '@/lib/demo-bus';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface LostItemModalProps {
  trip: Trip;
  onClose: () => void;
  onSubmit: (item: LostItem) => void;
}

type Step = 'category' | 'details' | 'confirm' | 'success';

export function LostItemModal({ trip, onClose, onSubmit }: LostItemModalProps) {
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<ItemCategory | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<ItemLocation | null>(null);
  const { reportItem, isSubmitting } = useReportLostItem();

  const { minutes, isUrgent } = getTimeSinceTrip(trip.arrivalTime);

  const handleSubmit = useCallback(async () => {
    if (!category || !description.trim()) return;

    const result = await reportItem({
      tripId: trip.id,
      category,
      description,
      location: location || 'unknown',
    });

    // No backend configured (or it errored): fall back to a locally built
    // item so the demo flow still completes.
    const newItem: LostItem = result.item ?? {
      id: `lost-${Date.now()}`,
      userId: 'user-001',
      tripId: trip.id,
      category,
      description,
      location: location || 'unknown',
      status: 'reported',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Nothing took the report, so nothing will push it to the crew either.
    // Carry it to /staff ourselves — that hop is the whole claim of the demo.
    // With a backend, `result.item` exists and the notification service owns it.
    if (!result.item) publishReport(newItem, trip);

    setStep('success');

    // Notify parent after showing success
    setTimeout(() => {
      onSubmit(newItem);
    }, config.timing.successMessageDelay);
  }, [category, description, location, trip, onSubmit, reportItem]);

  const handleSelectCategory = (cat: ItemCategory) => {
    setCategory(cat);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') setStep('category');
    if (step === 'confirm') setStep('details');
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-content animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 py-4 border-b border-app-cloud">
          <div className="flex items-center justify-between">
            <h2 id="modal-title" className="text-app-xl font-semibold text-app-charcoal">
              🧳 Verlust melden
            </h2>
            <button
              onClick={onClose}
              className="w-11 h-11 rounded-full bg-app-milk flex items-center justify-center text-app-granite hover:bg-app-cloud transition-colors"
              aria-label="Schliessen"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Urgency Alert */}
          {isUrgent && step !== 'success' && (
            <div className="bg-gradient-to-r from-brand to-brand-hover text-white rounded-app-lg p-5 mb-6 text-center">
              <div className="text-4xl mb-3">🚨</div>
              <h3 className="text-lg font-semibold mb-2">Schnell handeln!</h3>
              <p className="text-app-sm opacity-90">
                Ihr Zug hat vor {minutes} Minuten angehalten.
                {minutes <= 15
                  ? ' Fahrer kann jetzt noch suchen!'
                  : ' Je schneller Sie melden, desto besser die Chancen.'}
              </p>
            </div>
          )}

          {/* Trip Info (pre-filled) */}
          {step !== 'success' && (
            <div className="bg-app-milk rounded-app-md p-4 mb-6">
              <p className="text-app-xs text-app-granite mb-1">Betroffene Reise</p>
              <p className="text-app-base font-semibold text-app-charcoal">
                {trip.origin.name} → {trip.destination.name}
              </p>
              <p className="text-app-sm text-app-granite">
                {trip.vehicle.number} • {formatTime(trip.departureTime)}
                {trip.car && ` • Wagen ${trip.car}`}
                {trip.seat && ` • Platz ${trip.seat}`}
              </p>
            </div>
          )}

          {/* Step: Category Selection */}
          {step === 'category' && (
            <div>
              <h3 className="text-app-base font-semibold text-app-charcoal mb-4">
                Was haben Sie verloren?
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {ITEM_CATEGORIES.map((cat) => {
                  const cfg = ITEM_CATEGORY_CONFIG[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      className={`
                        bg-app-milk border-2 border-app-cloud rounded-app-md p-4 text-center
                        hover:border-brand hover:bg-brand-surface transition-all touch-feedback
                        ${category === cat ? 'border-brand bg-brand-surface' : ''}
                      `}
                    >
                      <div className="text-3xl mb-2">{cfg.icon}</div>
                      <div className="text-app-xs font-medium text-app-charcoal">{cfg.labelDe}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step: Details */}
          {step === 'details' && (
            <div>
              <button
                onClick={handleBack}
                className="text-app-sm text-app-granite hover:text-app-charcoal mb-4 flex items-center gap-1"
              >
                ← Zurück
              </button>

              <div className="space-y-5">
                <div>
                  <label className="block text-app-base font-semibold text-app-charcoal mb-2">
                    Beschreibung
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`z.B. Schwarzes ${ITEM_CATEGORY_CONFIG[category!].labelDe}`}
                    className="input-app"
                    autoFocus
                    minLength={config.validation.description.minLength}
                    maxLength={config.validation.description.maxLength}
                    required
                  />
                </div>

                <div>
                  <label className="block text-app-base font-semibold text-app-charcoal mb-2">
                    Wo genau?
                  </label>
                  <div className="space-y-2">
                    {ITEM_LOCATIONS.filter((l) => l !== 'unknown').map((loc) => {
                      const cfg = ITEM_LOCATION_CONFIG[loc];
                      return (
                        <button
                          key={loc}
                          onClick={() => setLocation(loc)}
                          className={`
                            w-full text-left p-4 rounded-app-md border-2 transition-all
                            ${
                              location === loc
                                ? 'border-brand bg-brand-surface'
                                : 'border-app-cloud bg-app-milk hover:border-app-silver'
                            }
                          `}
                        >
                          <span className="text-app-base text-app-charcoal">{cfg.labelDe}</span>
                          {trip.seat && loc === 'seat' && (
                            <span className="text-app-sm text-app-granite ml-2">
                              (Platz {trip.seat})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={
                    description.trim().length < config.validation.description.minLength ||
                    isSubmitting
                  }
                  className="btn-app-primary w-full flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <LoadingSpinner />
                      Wird gesendet...
                    </>
                  ) : (
                    <>🚨 Fahrer sofort benachrichtigen</>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="text-7xl mb-6">✅</div>
              <h3 className="text-app-2xl font-semibold text-app-charcoal mb-3">
                Fahrer benachrichtigt!
              </h3>
              <p className="text-app-base text-app-granite mb-8 max-w-xs mx-auto">
                Der Zugführer wurde sofort informiert und wird bei der nächsten Gelegenheit nach
                Ihrem Gegenstand suchen.
              </p>

              <div className="bg-app-milk rounded-app-lg p-4 text-left mb-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-app-success-surface flex items-center justify-center">
                    <span className="text-app-success text-xl">📍</span>
                  </div>
                  <div>
                    <p className="text-app-sm font-semibold text-app-charcoal">Nächste Schritte</p>
                    <p className="text-app-xs text-app-granite">
                      Sie werden per Push benachrichtigt
                    </p>
                  </div>
                </div>
                <ul className="space-y-2 text-app-sm text-app-granite ml-13">
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-app-cloud flex items-center justify-center text-xs">
                      1
                    </span>
                    Fahrer prüft bei Endstation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-app-cloud flex items-center justify-center text-xs">
                      2
                    </span>
                    Status-Update in der App
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-app-cloud flex items-center justify-center text-xs">
                      3
                    </span>
                    Abholung koordinieren
                  </li>
                </ul>
              </div>

              <button onClick={onClose} className="btn-app-secondary">
                Verstanden
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
