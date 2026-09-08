'use client';

import { useState } from 'react';
import Link from 'next/link';
import { tenant } from '@/lib/tenant';

export default function DemoPage() {
  const [activeView, setActiveView] = useState<'concept' | 'flow'>('concept');

  return (
    <div className="min-h-screen bg-gradient-to-b from-app-milk to-white">
      {/* Header */}
      <header className="bg-brand text-white px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl font-black tracking-wide">{tenant.wordmark}</span>
            <span className="text-app-lg font-light opacity-90">Fundbüro</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold mb-2">
            Echtzeit-Verlustmeldung für den ÖV
          </h1>
          <p className="text-app-base opacity-90 max-w-2xl">
            Verlorene Gegenstände sofort melden, Personal in Echtzeit benachrichtigen,
            Wiederfindungsrate massiv erhöhen.
          </p>
        </div>
      </header>

      {/* Navigation */}
      <div className="sticky top-0 bg-white border-b border-app-cloud z-10">
        <div className="max-w-4xl mx-auto flex">
          <button
            onClick={() => setActiveView('concept')}
            className={`flex-1 py-4 text-center font-medium border-b-2 transition-colors ${
              activeView === 'concept'
                ? 'text-brand border-brand'
                : 'text-app-granite border-transparent hover:text-app-charcoal'
            }`}
          >
            Das Konzept
          </button>
          <button
            onClick={() => setActiveView('flow')}
            className={`flex-1 py-4 text-center font-medium border-b-2 transition-colors ${
              activeView === 'flow'
                ? 'text-brand border-brand'
                : 'text-app-granite border-transparent hover:text-app-charcoal'
            }`}
          >
            Demo-Ansichten
          </button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {activeView === 'concept' && (
          <div className="space-y-12">
            {/* Problem Section */}
            <section>
              <h2 className="text-xl font-semibold text-app-charcoal mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span> Das Problem
              </h2>
              <div className="bg-white rounded-app-lg p-6 shadow-app-card border border-app-cloud">
                <div className="grid md:grid-cols-3 gap-6">
                  <StatCard
                    number="1.2M+"
                    label="Verlorene Gegenstände"
                    sublabel="pro Jahr im Schweizer ÖV"
                  />
                  <StatCard
                    number="~25%"
                    label="Wiederfindungsrate"
                    sublabel="aktuell (geschätzt)"
                  />
                  <StatCard number="24-48h" label="Reaktionszeit" sublabel="bis zur Bearbeitung" />
                </div>
                <p className="mt-6 text-app-base text-app-granite">
                  <strong className="text-app-charcoal">Kernproblem:</strong> Die Zeit zwischen
                  Verlust und Meldung ist zu lang. Bis der Passagier das Fundbüro kontaktiert, ist
                  der Zug längst weitergefahren und der Gegenstand nicht mehr auffindbar.
                </p>
              </div>
            </section>

            {/* Solution Section */}
            <section>
              <h2 className="text-xl font-semibold text-app-charcoal mb-4 flex items-center gap-2">
                <span className="text-2xl">💡</span> Die Lösung
              </h2>
              <div className="bg-white rounded-app-lg p-6 shadow-app-card border border-app-cloud">
                <div className="space-y-6">
                  <FlowStep
                    number={1}
                    title="Sofort-Meldung"
                    description="Passagier meldet Verlust direkt in der Mobile App – mit vorausgefüllten Reisedaten"
                    time="< 1 Minute"
                    icon="📱"
                  />
                  <FlowStep
                    number={2}
                    title="Echtzeit-Benachrichtigung"
                    description="Zugpersonal erhält sofort Push-Nachricht mit genauer Position (Wagen, Sitzplatz)"
                    time="< 30 Sekunden"
                    icon="🔔"
                  />
                  <FlowStep
                    number={3}
                    title="Aktive Suche"
                    description="Personal kann bei Endstation oder Halt aktiv suchen"
                    time="Während der Fahrt"
                    icon="🔍"
                  />
                  <FlowStep
                    number={4}
                    title="Status-Update"
                    description="Passagier erhält Echtzeit-Update: Gefunden oder nicht gefunden"
                    time="< 30 Minuten"
                    icon="✅"
                  />
                </div>
              </div>
            </section>

            {/* Impact Section */}
            <section>
              <h2 className="text-xl font-semibold text-app-charcoal mb-4 flex items-center gap-2">
                <span className="text-2xl">📈</span> Erwartete Wirkung
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                <ImpactCard
                  icon="📊"
                  title="Wiederfindungsrate"
                  current="~25%"
                  target=">70%"
                  description="Durch sofortige Meldung und aktive Suche"
                />
                <ImpactCard
                  icon="⏱️"
                  title="Reaktionszeit"
                  current="24-48h"
                  target="<30 Min"
                  description="Echtzeit-Kommunikation statt E-Mail"
                />
                <ImpactCard
                  icon="😊"
                  title="Kundenzufriedenheit"
                  current="Frustration"
                  target="Begeisterung"
                  description="Proaktiver Service statt passivem Prozess"
                />
                <ImpactCard
                  icon="💰"
                  title="Kosten"
                  current="Fundbüro-Betrieb"
                  target="Reduktion"
                  description="Weniger manuelle Bearbeitung"
                />
              </div>
            </section>
          </div>
        )}

        {activeView === 'flow' && (
          <div className="space-y-8">
            <p className="text-app-base text-app-granite text-center">
              Öffnen Sie beide Ansichten nebeneinander, um den Echtzeit-Flow zu erleben.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Passenger View */}
              <div className="bg-white rounded-app-lg overflow-hidden shadow-app-card border border-app-cloud">
                <div className="bg-gradient-to-r from-app-blue to-app-blue text-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">👤</span>
                    <div>
                      <h3 className="font-semibold">Passagier-Ansicht</h3>
                      <p className="text-app-sm opacity-90">Mobile App Integration</p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-app-sm text-app-granite mb-4">
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      6-Tab Navigation wie die Betreiber-App
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      &quot;Reisen&quot;-Tab mit Einzelreisen
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      Verlust direkt bei der Reise melden
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      Echtzeit Status-Updates
                    </li>
                  </ul>
                  <Link
                    href="/"
                    target="_blank"
                    className="btn-app-primary w-full text-center block"
                  >
                    Passagier-App öffnen →
                  </Link>
                </div>
              </div>

              {/* Staff View */}
              <div className="bg-white rounded-app-lg overflow-hidden shadow-app-card border border-app-cloud">
                <div className="bg-gradient-to-r from-brand to-brand-hover text-white p-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🚂</span>
                    <div>
                      <h3 className="font-semibold">Mitarbeiter-Ansicht</h3>
                      <p className="text-app-sm opacity-90">
                        Für Lokführer, Zugbegleiter, Kontrolleure
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <ul className="space-y-2 text-app-sm text-app-granite mb-4">
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      Push-Benachrichtigungen
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      Genaue Positionsangaben
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-app-success">✓</span>
                      Ein-Klick Rückmeldung
                    </li>
                  </ul>
                  <Link
                    href="/staff"
                    target="_blank"
                    className="btn-app-primary w-full text-center block"
                  >
                    Mitarbeiter-App öffnen →
                  </Link>
                </div>
              </div>
            </div>

            {/* Demo Instructions */}
            <div className="bg-app-milk rounded-app-lg p-6 border border-app-cloud">
              <h3 className="font-semibold text-app-charcoal mb-4 flex items-center gap-2">
                <span>🎬</span> Demo-Ablauf
              </h3>
              <ol className="space-y-3 text-app-sm">
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-medium shrink-0">
                    1
                  </span>
                  <span className="text-app-granite">
                    <strong className="text-app-charcoal">Passagier-App:</strong> Öffnen Sie den
                    &quot;Reisen&quot;-Tab (startet automatisch dort)
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-medium shrink-0">
                    2
                  </span>
                  <span className="text-app-granite">
                    <strong className="text-app-charcoal">Reise wählen:</strong> Klicken Sie auf
                    &quot;Verlust?&quot; bei einer Ihrer Einzelreisen
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-medium shrink-0">
                    3
                  </span>
                  <span className="text-app-granite">
                    <strong className="text-app-charcoal">Details eingeben:</strong> Kategorie
                    wählen, Beschreibung und Position angeben
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-medium shrink-0">
                    4
                  </span>
                  <span className="text-app-granite">
                    <strong className="text-app-charcoal">Mitarbeiter-App:</strong> Beobachten Sie
                    die eingehende Benachrichtigung in Echtzeit
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center text-xs font-medium shrink-0">
                    5
                  </span>
                  <span className="text-app-granite">
                    <strong className="text-app-charcoal">Rückmeldung:</strong> Das Personal kann
                    &quot;Gefunden&quot; oder &quot;Nicht gefunden&quot; melden
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-app-charcoal text-white py-8 mt-12">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-app-sm opacity-70 mb-2">Konzept & Prototyp entwickelt von</p>
          <p className="text-app-base font-medium">
            Ein Vorschlag zur Verbesserung des Kundenerlebnisses
          </p>
          <p className="text-app-xs opacity-50 mt-4">
            Basierend auf First-Principles-Analyse des aktuellen Fundbüro-Prozesses
          </p>
        </div>
      </footer>
    </div>
  );
}

function StatCard({
  number,
  label,
  sublabel,
}: {
  number: string;
  label: string;
  sublabel: string;
}) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-brand mb-1">{number}</div>
      <div className="text-app-base font-medium text-app-charcoal">{label}</div>
      <div className="text-app-xs text-app-granite">{sublabel}</div>
    </div>
  );
}

function FlowStep({
  number,
  title,
  description,
  time,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  time: string;
  icon: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="shrink-0">
        <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-semibold">
          {number}
        </div>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{icon}</span>
          <h4 className="font-semibold text-app-charcoal">{title}</h4>
          <span className="text-app-xs bg-app-milk text-app-granite px-2 py-0.5 rounded-full">
            {time}
          </span>
        </div>
        <p className="text-app-sm text-app-granite">{description}</p>
      </div>
    </div>
  );
}

function ImpactCard({
  icon,
  title,
  current,
  target,
  description,
}: {
  icon: string;
  title: string;
  current: string;
  target: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-app-lg p-5 shadow-app-card border border-app-cloud">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-semibold text-app-charcoal mb-2">{title}</h4>
          <div className="flex items-center gap-2 text-app-sm mb-2">
            <span className="text-app-granite line-through">{current}</span>
            <span className="text-app-granite">→</span>
            <span className="text-app-success font-semibold">{target}</span>
          </div>
          <p className="text-app-xs text-app-granite">{description}</p>
        </div>
      </div>
    </div>
  );
}
