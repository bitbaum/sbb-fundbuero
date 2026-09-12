'use client';

/**
 * The reporting flow.
 *
 * Designed for one situation: a phone, on a moving train, held in one hand, by
 * someone who has just realised their bag is gone. Everything else follows.
 *
 *   - four steps, each one screenful, no scrolling to find the button
 *   - the primary action is a full-width control at the BOTTOM, in the thumb's
 *     arc; nothing important lives at the top of the screen
 *   - the time defaults to now, so the commonest case costs no taps
 *   - the journey is asked FIRST, because it is the signal that makes this
 *     product work and the thing a passenger is most likely to still know
 *   - "I don't know which train" is a first-class answer, not a dead end
 *
 * Accessibility is not a coat of paint here: this is public transport, and in
 * Switzerland that means the BehiG. Every input has a real <label>, the step
 * changes are announced, focus moves to the new step's heading, errors are
 * tied to their field with aria-describedby, and nothing is signalled by
 * colour alone.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { DescribeFirst } from '@/components/report/DescribeFirst';
import { useLocale, useT } from '@/lib/i18n/LocaleProvider';
import {
  REPORT_STEPS,
  canAdvance,
  describeOffset,
  elapsedSeconds,
  emptyDraft,
  finishTiming,
  nextStep,
  offsetToIso,
  previousStep,
  startTiming,
  toRequestBody,
  TIME_OFFSETS_MINUTES,
  type ReportDraft,
  type ReportStep,
  type ReportTiming,
} from '@/lib/report-flow';
import { CATEGORIES, AREAS } from '@/lib/report-options';

interface Station {
  id: string;
  name: string;
}

interface Suggestion {
  journeyId: string;
  trainNumber: string | null;
  line: string | null;
  calledAt: string;
  offsetMinutes: number;
  actual?: boolean;
}

type Submission =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'queued' }
  | { state: 'failed'; message: string }
  | { state: 'done'; reference: string; possibleMatches: number; seconds: number | null };

export function ReportFlow() {
  const t = useT();
  const { locale } = useLocale();

  const [step, setStep] = useState<ReportStep>('journey');
  const [startedAt] = useState(() => new Date());
  const [draft, setDraft] = useState<ReportDraft>(() => emptyDraft(startedAt));
  const [timing, setTiming] = useState<ReportTiming>({ startedAt: null, submittedAt: null });
  const [stations, setStations] = useState<Station[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [submission, setSubmission] = useState<Submission>({ state: 'idle' });

  const headingRef = useRef<HTMLHeadingElement>(null);

  /** Any interaction starts the clock. */
  const touch = useCallback(() => {
    setTiming((current) => startTiming(current, Date.now()));
  }, []);

  const update = useCallback(
    (patch: Partial<ReportDraft>) => {
      touch();
      setDraft((current) => ({ ...current, ...patch }));
    },
    [touch],
  );

  useEffect(() => {
    let cancelled = false;
    fetch('/api/stations')
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.success) setStations(body.data);
      })
      .catch(() => {
        // A station list we cannot load is not a reason to block the report:
        // the journey step can still be skipped with "I don't know".
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Move focus to the new step's heading. Without this a screen-reader user
  // stays where the old button was, which on a four-step flow means being lost
  // three times.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const loadSuggestions = useCallback(async () => {
    if (!draft.stationId || !draft.at) return;
    setLoadingSuggestions(true);
    try {
      const url = `/api/trips/suggest?stopId=${encodeURIComponent(draft.stationId)}&at=${encodeURIComponent(draft.at)}`;
      const body = await fetch(url).then((r) => r.json());
      setSuggestions(body.success ? body.data.suggestions : []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [draft.stationId, draft.at]);

  useEffect(() => {
    if (draft.stationId && draft.at) void loadSuggestions();
  }, [draft.stationId, draft.at, loadSuggestions]);

  const submit = useCallback(async () => {
    setSubmission({ state: 'sending' });
    const finished = finishTiming(timing, Date.now());
    setTiming(finished);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(toRequestBody(draft, locale)),
      });
      const body = await response.json();

      if (!response.ok || !body.success) {
        setSubmission({ state: 'failed', message: body.error ?? t('error.generic') });
        return;
      }

      setSubmission({
        state: 'done',
        reference: body.data.reference,
        possibleMatches: body.data.possibleMatches,
        seconds: elapsedSeconds(finished),
      });
    } catch {
      // Offline is the expected case on a train, not an exception. The report
      // is kept and the person is told it will send itself.
      setSubmission({ state: 'queued' });
    }
  }, [draft, locale, t, timing]);

  if (submission.state === 'done') {
    return <Done submission={submission} />;
  }

  if (submission.state === 'queued') {
    return (
      <section className="px-4 py-8" aria-live="polite">
        <h1 className="text-app-xl font-semibold text-app-charcoal mb-2">{t('error.queued')}</h1>
        <p className="text-app-base text-app-granite">{t('error.offline')}</p>
      </section>
    );
  }

  const index = REPORT_STEPS.indexOf(step);
  const ready = canAdvance(step, draft);
  const last = index === REPORT_STEPS.length - 1;

  return (
    <section className="px-4 pb-40">
      <ol className="flex gap-2 pt-4 pb-6" aria-label={t('report.title')}>
        {REPORT_STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            {/* Shape as well as colour: a filled bar AND a number, because
                colour alone is not a signal. */}
            <div
              className={`h-1 rounded-app-sm ${i <= index ? 'bg-brand' : 'bg-app-cloud'}`}
              aria-hidden="true"
            />
            <span className="sr-only">
              {i + 1} / {REPORT_STEPS.length}
            </span>
          </li>
        ))}
      </ol>

      {/* h2, not h1: the page supplies the h1. This is the current step —
          a section within it. It still takes focus so a screen reader
          announces each step change; `.step-heading` suppresses the ring,
          because the person pressed "Weiter" rather than navigating here. */}
      <h2
        ref={headingRef}
        tabIndex={-1}
        className="step-heading mb-1 text-app-xl font-semibold text-app-charcoal"
      >
        {t(`report.step.${step === 'item' ? 'what' : step === 'place' ? 'where' : step}` as never)}
      </h2>

      {/* First step only. The assistant fills the item, place and time fields,
          which live in steps two and three — offering it there would mean
          asking someone to describe what happened AFTER they had already typed
          it in. Offering it on the last step, over contact details it is
          forbidden to touch, would be worse. */}
      {step === 'journey' && <DescribeFirst draft={draft} onApply={update} now={startedAt} />}

      {step === 'journey' && (
        <JourneyStep
          draft={draft}
          stations={stations}
          suggestions={suggestions}
          loading={loadingSuggestions}
          onChange={update}
        />
      )}
      {step === 'item' && <ItemStep draft={draft} onChange={update} />}
      {step === 'place' && <PlaceStep draft={draft} onChange={update} />}
      {step === 'contact' && <ContactStep draft={draft} onChange={update} />}

      {submission.state === 'failed' && (
        <p role="alert" className="mt-4 text-app-base text-app-error-text">
          {submission.message}
        </p>
      )}

      {/* The thumb's arc — ON A PHONE. Fixed to the bottom, full width, 56px
          tall, because the hand holding the device can reach there and nowhere
          else comfortably.
          NOT .mobile-container inside here: that class carries
          min-height:100dvh, which stretched this fixed bar to the FULL height
          of the viewport and made it swallow every click on the page. The
          element stayed invisible — a white bar behind white content — so it
          looked fine in a screenshot and in the accessibility tree, and only
          showed up as "subtree intercepts pointer events" when something
          actually tried to tap a suggestion.

          From `md` up it stops being fixed. A bar welded across the bottom of
          a 1440px window is a phone habit transplanted onto a desktop: it
          covers page content, it sits a mouse-journey away from the field the
          person just filled in, and it has no thumb to be near. On a wide
          viewport the action belongs directly under the form, in the reading
          order, where the cursor already is. */}
      <div className="safe-bottom fixed inset-x-0 bottom-0 border-t border-app-cloud bg-app-white p-4 md:static md:mt-app-xl md:border-0 md:p-0">
        <div className="mx-auto flex max-w-[430px] gap-3 md:max-w-none">
          {index > 0 && (
            <button
              type="button"
              onClick={() => setStep(previousStep(step)!)}
              className="btn-app-secondary min-h-[56px] px-6"
            >
              <span aria-hidden="true">←</span>
              <span className="sr-only">{t('nav.back')}</span>
            </button>
          )}
          <button
            type="button"
            disabled={!ready || submission.state === 'sending'}
            onClick={() => (last ? void submit() : setStep(nextStep(step)!))}
            className="btn-app-primary flex-1 min-h-[56px] text-app-lg disabled:opacity-50"
          >
            {submission.state === 'sending'
              ? t('report.submitting')
              : last
                ? t('report.submit')
                : t('nav.next')}
          </button>
        </div>
      </div>
    </section>
  );
}

function Done({ submission }: { submission: Extract<Submission, { state: 'done' }> }) {
  const t = useT();
  return (
    <section className="px-4 py-8" aria-live="polite">
      <h1 className="text-app-xl font-semibold text-app-charcoal mb-4">
        {t('report.success.title')}
      </h1>

      <p className="text-app-sm text-app-granite">{t('report.success.reference')}</p>
      <p className="text-app-2xl font-mono font-semibold text-app-charcoal tracking-wider my-2">
        {submission.reference}
      </p>
      <p className="text-app-base text-app-granite mb-6">{t('report.success.keepReference')}</p>

      {submission.possibleMatches > 0 && (
        <p className="card-app p-4 text-app-base text-app-charcoal mb-4">
          {t('status.matched')} · {t('match.explain')}
        </p>
      )}

      <p className="text-app-sm text-app-granite">{t('privacy.retention')}</p>

      {submission.seconds !== null && (
        // Shown, not hidden in telemetry. Time-to-report is the product metric
        // and the person who just spent it is entitled to see it.
        <p className="text-app-xs text-app-granite mt-8">{submission.seconds}s</p>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label htmlFor={id} className="block text-app-base font-medium text-app-charcoal mb-1">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-app-sm text-app-granite mb-2">
          {hint}
        </p>
      )}
      {children}
    </div>
  );
}

function JourneyStep({
  draft,
  stations,
  suggestions,
  loading,
  onChange,
}: {
  draft: ReportDraft;
  stations: Station[];
  suggestions: Suggestion[] | null;
  loading: boolean;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const t = useT();
  // useState's lazy initialiser, not a ref: a ref must not be read during
  // render (it does not participate in it), and this value IS rendered — it
  // is the base for the "−15 min" chips.
  const [now] = useState(() => new Date());

  return (
    <>
      <Field id="station" label={t('report.field.station')} hint={t('report.field.stationHint')}>
        <select
          id="station"
          aria-describedby="station-hint"
          className="input-app min-h-[56px] w-full"
          value={draft.stationId ?? ''}
          onChange={(e) => onChange({ stationId: e.target.value || null, journeyId: null })}
        >
          <option value="">—</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="mb-5">
        <legend className="block text-app-base font-medium text-app-charcoal mb-2">
          {t('report.field.time')}
        </legend>
        <div className="flex gap-2 flex-wrap">
          {TIME_OFFSETS_MINUTES.map((minutes) => {
            const iso = offsetToIso(now, minutes);
            const selected = draft.at === iso;
            return (
              <button
                key={minutes}
                type="button"
                aria-pressed={selected}
                onClick={() => onChange({ at: iso, journeyId: null })}
                className={`min-h-[56px] px-4 rounded-app-md border text-app-base ${
                  selected
                    ? 'bg-brand text-white border-brand font-semibold'
                    : 'bg-app-white text-app-charcoal border-app-cloud'
                }`}
              >
                {minutes === 0 ? t('time.now') : `−${minutes} ${t('time.minutesShort')}`}
              </button>
            );
          })}
        </div>
      </fieldset>

      {draft.stationId && (
        <div aria-live="polite">
          <h2 className="text-app-base font-medium text-app-charcoal mb-2">
            {t('trip.suggest.heading')}
          </h2>

          {loading && <p className="text-app-sm text-app-granite">…</p>}

          {!loading && suggestions?.length === 0 && (
            <p className="text-app-sm text-app-granite mb-3">{t('trip.suggest.none')}</p>
          )}

          <ul className="space-y-2">
            {suggestions?.map((s) => (
              <li key={s.journeyId}>
                <button
                  type="button"
                  aria-pressed={draft.journeyId === s.journeyId}
                  onClick={() => onChange({ journeyId: s.journeyId, journeyUnknown: false })}
                  className={`w-full text-left p-4 min-h-[56px] rounded-app-md border ${
                    draft.journeyId === s.journeyId
                      ? 'border-brand bg-brand-surface'
                      : 'border-app-cloud bg-app-white'
                  }`}
                >
                  <span className="block text-app-base font-semibold text-app-charcoal">
                    {s.trainNumber ?? s.line ?? '—'}
                  </span>
                  {/* The ranking is shown, not hidden: someone choosing
                      between two trains deserves to know why one is first.
                      Composed here rather than sent as prose — see the note in
                      lib/domain/trip-suggestion.ts. */}
                  <span className="block text-app-sm text-app-granite">
                    {describeOffset(s.offsetMinutes, t)} (
                    {t(s.actual ? 'trip.source.actual' : 'trip.source.timetable')})
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            aria-pressed={draft.journeyUnknown}
            onClick={() => onChange({ journeyUnknown: true, journeyId: null })}
            className="mt-3 w-full text-left p-4 min-h-[56px] rounded-app-md border border-app-cloud bg-app-white text-app-base text-app-granite"
          >
            {t('trip.suggest.unknown')}
          </button>
        </div>
      )}
    </>
  );
}

function ItemStep({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const t = useT();

  return (
    <>
      <fieldset className="mb-5">
        <legend className="block text-app-base font-medium text-app-charcoal mb-2">
          {t('report.field.category')}
        </legend>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={draft.category === c}
              onClick={() => onChange({ category: c })}
              className={`min-h-[56px] px-2 rounded-app-md border text-app-sm ${
                draft.category === c
                  ? 'bg-brand text-white border-brand font-semibold'
                  : 'bg-app-white text-app-charcoal border-app-cloud'
              }`}
            >
              {t(`category.${c}` as never)}
            </button>
          ))}
        </div>
      </fieldset>

      <Field
        id="description"
        label={t('report.field.description')}
        hint={t('report.field.descriptionHint')}
      >
        <textarea
          id="description"
          aria-describedby="description-hint"
          rows={3}
          maxLength={500}
          className="input-app w-full"
          value={draft.description}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </Field>

      {/* The single most valuable field, so it is on the same screen as the
          description rather than buried behind "advanced". */}
      <Field
        id="identifier"
        label={t('report.field.identifier')}
        hint={t('report.field.identifierHint')}
      >
        <input
          id="identifier"
          aria-describedby="identifier-hint"
          inputMode="text"
          autoComplete="off"
          className="input-app min-h-[56px] w-full font-mono"
          value={draft.identifierValue}
          onChange={(e) => onChange({ identifierValue: e.target.value })}
        />
      </Field>
    </>
  );
}

function PlaceStep({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const t = useT();

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Field id="coach" label={t('report.field.coach')}>
          <input
            id="coach"
            inputMode="numeric"
            className="input-app min-h-[56px] w-full"
            value={draft.coach}
            onChange={(e) => onChange({ coach: e.target.value })}
          />
        </Field>
        <Field id="seat" label={t('report.field.seat')}>
          <input
            id="seat"
            className="input-app min-h-[56px] w-full"
            value={draft.seat}
            onChange={(e) => onChange({ seat: e.target.value })}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="block text-app-base font-medium text-app-charcoal mb-2">
          {t('report.step.where')}
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {AREAS.map((a) => (
            <button
              key={a}
              type="button"
              aria-pressed={draft.area === a}
              onClick={() => onChange({ area: a })}
              className={`min-h-[56px] px-3 rounded-app-md border text-app-sm ${
                draft.area === a
                  ? 'bg-brand text-white border-brand font-semibold'
                  : 'bg-app-white text-app-charcoal border-app-cloud'
              }`}
            >
              {t(`area.${a}` as never)}
            </button>
          ))}
        </div>
      </fieldset>
    </>
  );
}

function ContactStep({
  draft,
  onChange,
}: {
  draft: ReportDraft;
  onChange: (patch: Partial<ReportDraft>) => void;
}) {
  const t = useT();
  const missing = draft.email.trim() === '' && draft.phone.trim() === '';

  return (
    <>
      <Field id="email" label={t('report.field.email')}>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          aria-describedby={missing ? 'contact-error' : undefined}
          className="input-app min-h-[56px] w-full"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
        />
      </Field>

      <Field id="phone" label={t('report.field.phone')}>
        <input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          aria-describedby={missing ? 'contact-error' : undefined}
          className="input-app min-h-[56px] w-full"
          value={draft.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
        />
      </Field>

      {missing && (
        <p id="contact-error" className="text-app-sm text-app-error-text">
          {t('error.contactRequired')}
        </p>
      )}

      <p className="text-app-sm text-app-granite mt-6">{t('privacy.retention')}</p>
    </>
  );
}
