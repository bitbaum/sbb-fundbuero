'use client';

/**
 * The crew view. A DIFFERENT product from the passenger app, not a skin on it.
 *
 * It is read while walking through a carriage, one-handed, on a connection that
 * drops in every tunnel. So:
 *
 *   - each report is one glanceable row: coach, category, how long ago
 *   - large type and high contrast, because this gets read at arm's length
 *   - the connection state is ALWAYS on screen. Crew acting on a stale list is
 *     the failure that matters, and a silent stale list looks identical to a
 *     quiet shift
 *   - EventSource reconnects by itself, indefinitely. The code this replaces
 *     hand-rolled a backoff that gave up permanently after five attempts
 *
 * The staff token is entered here and kept in sessionStorage — never
 * localStorage. A shared crew device should forget it when the tab closes, and
 * `AGENTS.md` forbids persisting anything personal on one.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { CONNECTION_BADGE_TOKENS } from '@/lib/badge-tokens';
import { useT } from '@/lib/i18n/LocaleProvider';

interface Report {
  reference: string;
  state: string;
  category: string;
  description: string;
  coach: string | null;
  seat: string | null;
  area: string | null;
  journeyId: string | null;
  lostFrom: string | null;
  createdAt: string;
}

type Connection = 'connecting' | 'live' | 'down';

const TOKEN_KEY = 'staff_token';

/**
 * The token, read from sessionStorage as an external store.
 *
 * useSyncExternalStore rather than "read it in an effect and setState":
 * sessionStorage IS an external store, this is the primitive for reading one,
 * and it gives a server snapshot so SSR and the first client render agree
 * instead of hydrating into a mismatch.
 */
const tokenStore = {
  subscribe(onChange: () => void) {
    window.addEventListener('storage', onChange);
    return () => window.removeEventListener('storage', onChange);
  },
  getSnapshot: () => sessionStorage.getItem(TOKEN_KEY),
  getServerSnapshot: () => null,
};

export function StaffBoard() {
  const t = useT();
  const [entered, setEntered] = useState<string | null>(null);
  const stored = useSyncExternalStore(
    tokenStore.subscribe,
    tokenStore.getSnapshot,
    tokenStore.getServerSnapshot,
  );
  const token = entered ?? stored;

  const [reports, setReports] = useState<Report[]>([]);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [error, setError] = useState<string | null>(null);
  const sourceRef = useRef<EventSource | null>(null);

  const load = useCallback(async (staffToken: string) => {
    try {
      const response = await fetch('/api/reports', {
        headers: { 'x-staff-token': staffToken },
      });
      const body = await response.json();

      if (!response.ok || !body.success) {
        setError(body.error ?? 'Failed');
        return false;
      }

      setReports(body.data);
      setError(null);
      return true;
    } catch {
      setConnection('down');
      return false;
    }
  }, []);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    // Every setState here happens in an async continuation, never
    // synchronously in the effect body — a synchronous one cascades a second
    // render before the browser has painted the first.
    void (async () => {
      const ok = await load(token);
      if (!ok || cancelled) return;

      // The token has to travel on the URL: EventSource cannot send headers.
      // Acceptable here and nowhere else — it is a shared crew secret, not a
      // personal credential, and the alternative is no live updates at all.
      const source = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
      sourceRef.current = source;

      source.onopen = () => setConnection('live');
      source.onerror = () => setConnection('down');
      source.addEventListener('report.submitted', () => void load(token));
      source.addEventListener('found_item.recorded', () => void load(token));
    })();

    return () => {
      cancelled = true;
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [token, load]);

  if (!token) {
    return <TokenPrompt onSubmit={setEntered} />;
  }

  return (
    <section className="pb-8">
      <header className="sticky top-0 bg-app-white border-b border-app-cloud py-3 z-10">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="text-app-xl font-semibold text-app-charcoal">{t('staff.title')}</h1>
          <ConnectionBadge connection={connection} />
        </div>
      </header>

      {error && (
        <p role="alert" className="mt-4 text-app-base text-app-error-text">
          {error}
        </p>
      )}

      {reports.length === 0 && !error && (
        <p className="mt-8 text-app-base text-app-granite">{t('staff.empty')}</p>
      )}

      <ul className="mt-4 space-y-3">
        {reports.map((report) => (
          <li key={report.reference} className="card-app p-4 border-l-4 border-brand">
            <div className="flex items-baseline justify-between gap-3">
              {/* Coach first and biggest: it is the one thing that tells crew
                  where to walk. */}
              <span className="text-app-2xl font-bold text-app-charcoal tabular-nums">
                {report.coach ? `${t('report.field.coach')} ${report.coach}` : '—'}
              </span>
              <time
                dateTime={report.createdAt}
                className="text-app-sm text-app-granite whitespace-nowrap"
              >
                {ago(report.createdAt, t)}
              </time>
            </div>

            <p className="text-app-lg text-app-charcoal mt-1">
              {t(`category.${report.category}` as never)}
              {report.area ? ` · ${t(`area.${report.area}` as never)}` : ''}
              {report.seat ? ` · ${report.seat}` : ''}
            </p>

            <p className="text-app-base text-app-granite mt-1">{report.description}</p>

            <p className="text-app-xs text-app-granite mt-2 font-mono">{report.reference}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConnectionBadge({ connection }: { connection: Connection }) {
  const t = useT();

  // Text, not just a colour. Colour alone is not a signal, and this is the one
  // indicator crew must be able to trust at a glance.
  const label =
    connection === 'live'
      ? t('staff.connected')
      : connection === 'connecting'
        ? t('staff.reconnecting')
        : t('staff.disconnected');

  // From the badge SSOT, so the contrast test checks the same pair that
  // renders — for every tenant, since --brand is whatever an operator says.
  const { color, textColor } = CONNECTION_BADGE_TOKENS[connection];

  return (
    <span
      role="status"
      aria-live="polite"
      className={`px-3 py-1 rounded-app-sm text-app-sm font-semibold ${color} ${textColor}`}
    >
      {label}
    </span>
  );
}

function TokenPrompt({ onSubmit }: { onSubmit: (token: string) => void }) {
  const t = useT();
  const [value, setValue] = useState('');

  return (
    <form
      className="py-8"
      onSubmit={(e) => {
        e.preventDefault();
        if (!value.trim()) return;
        // sessionStorage, not localStorage: a shared crew device forgets this
        // when the tab closes.
        sessionStorage.setItem(TOKEN_KEY, value.trim());
        onSubmit(value.trim());
      }}
    >
      <h1 className="text-app-xl font-semibold text-app-charcoal mb-4">{t('nav.staff')}</h1>

      <label htmlFor="staff-token" className="block text-app-base text-app-charcoal mb-2">
        {t('nav.staff')}
      </label>
      <input
        id="staff-token"
        type="password"
        autoComplete="off"
        className="input-app min-h-[56px] w-full"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />

      <button type="submit" className="btn-app-primary w-full min-h-[56px] mt-4">
        {t('trip.suggest.confirm')}
      </button>
    </form>
  );
}

/**
 * "how long ago", translated.
 *
 * No plural rules needed: "5 min" is invariant in all four languages, which is
 * why the catalogue holds an abbreviation rather than a sentence. A phrase
 * would have needed one function per language.
 */
function ago(
  iso: string,
  t: (key: 'time.now' | 'time.minutesShort' | 'time.hoursShort') => string,
): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  if (minutes < 1) return t('time.now');
  if (minutes < 60) return `${minutes} ${t('time.minutesShort')}`;
  return `${Math.floor(minutes / 60)} ${t('time.hoursShort')}`;
}
