'use client';

import { useId, useState } from 'react';

import { useT } from '@/lib/i18n/LocaleProvider';
import { offsetToIso, type ReportDraft } from '@/lib/report-flow';
import type { MessageKey } from '@/lib/i18n';

/**
 * "Just tell us what happened."
 *
 * The form is four steps and about ten controls. For someone standing on a
 * platform having just watched their train leave with their bag on it, the
 * cheapest possible input is the sentence they are already saying out loud.
 * This takes that sentence and fills the form in from it.
 *
 * ── IT FILLS, IT DOES NOT SUBMIT ────────────────────────────────────────────
 *
 * The result lands in the form, visibly, and the person walks through it as
 * normal. No auto-advance, no "we've got this, press send". Two reasons, and
 * the second is the real one:
 *
 *   - the model is reading prose written by someone upset and in a hurry, and
 *     it will sometimes be wrong;
 *   - a filled form the person then reviews is a form they have checked. A
 *     submitted one is a claim they never saw. This product's whole argument
 *     is that the data is trustworthy enough to match on.
 *
 * That is why the success message says "please check" rather than "done", and
 * why the filled fields are not styled as confirmed.
 *
 * ── THREE OUTCOMES, THREE MESSAGES ──────────────────────────────────────────
 *
 * Not configured / understood nothing / broke. AGENTS.md rule 2 is about not
 * dressing one state as another, and the collapse people reach for here is a
 * single "something went wrong", which tells a visitor to retry a thing that
 * cannot work and tells the operator nothing. 501 is the server saying the
 * feature is switched off in this build; the form still works, and the message
 * says so.
 *
 * ── VOICE ───────────────────────────────────────────────────────────────────
 *
 * There is no microphone button, on purpose. Every phone's keyboard already
 * has dictation, wired to the OS speech engine the person has already granted
 * permission to and already knows how to use. A bespoke recorder would mean a
 * second permission prompt, an audio upload, and a transcript this product
 * would then have to store — for no gain over a textarea.
 */

/** Fields the client will apply. Mirrors the server registry deliberately. */
const TEXT_FIELDS = ['description', 'colour', 'identifierValue', 'coach', 'seat'] as const;

type Outcome = { kind: 'idle' | 'working' } | { kind: 'done'; message: MessageKey };

export function DescribeFirst({
  draft,
  onApply,
  now,
}: {
  draft: ReportDraft;
  onApply: (patch: Partial<ReportDraft>) => void;
  now: Date;
}) {
  const t = useT();
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'idle' });
  const fieldId = useId();
  const statusId = useId();

  async function run() {
    setOutcome({ kind: 'working' });

    let response: Response;
    try {
      response = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          target: 'report',
          intent: 'fill',
          instruction: text,
          // The model revises rather than reinvents, and `ai-forms` protects
          // anything the person already typed on a `fill` pass.
          values: {
            category: draft.category ?? undefined,
            description: draft.description || undefined,
            colour: draft.colour || undefined,
            identifierValue: draft.identifierValue || undefined,
            coach: draft.coach || undefined,
            seat: draft.seat || undefined,
            area: draft.area ?? undefined,
          },
        }),
      });
    } catch {
      // The network, not the server. Same remedy for the reader either way.
      setOutcome({ kind: 'done', message: 'assist.failed' });
      return;
    }

    // 501 is the only status that means "this build does not have the feature".
    if (response.status === 501) {
      setOutcome({ kind: 'done', message: 'assist.unavailable' });
      return;
    }
    if (!response.ok) {
      setOutcome({ kind: 'done', message: 'assist.failed' });
      return;
    }

    const body: unknown = await response.json().catch(() => null);
    const values =
      body && typeof body === 'object' && 'values' in body
        ? ((body as { values?: Record<string, unknown> }).values ?? {})
        : {};
    const changed =
      body && typeof body === 'object' && 'changed' in body
        ? ((body as { changed?: string[] }).changed ?? [])
        : [];

    const patch = toDraftPatch(values, now);

    if (changed.length === 0 || Object.keys(patch).length === 0) {
      setOutcome({ kind: 'done', message: 'assist.nothing' });
      return;
    }

    onApply(patch);
    setOutcome({ kind: 'done', message: 'assist.filled' });
  }

  const busy = outcome.kind === 'working';

  return (
    <section className="mb-app-lg rounded-app-lg border border-app-cloud bg-app-milk p-app-md">
      <h2 className="text-app-base font-bold text-app-charcoal">{t('assist.title')}</h2>
      <p className="mt-app-xs text-app-sm text-app-granite" id={`${fieldId}-hint`}>
        {t('assist.hint')}
      </p>

      <label className="sr-only" htmlFor={fieldId}>
        {t('assist.title')}
      </label>
      <textarea
        id={fieldId}
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        disabled={busy}
        aria-describedby={`${fieldId}-hint`}
        placeholder={t('assist.placeholder')}
        className="input-app mt-app-sm w-full"
      />

      <button
        type="button"
        onClick={() => void run()}
        // `ai-forms` rejects very short instructions anyway; stopping here
        // saves a round trip and gives the reader an obvious cause.
        disabled={busy || text.trim().length < 12}
        className="btn-app-secondary mt-app-sm min-h-[44px] w-full"
      >
        {busy ? t('assist.working') : t('assist.action')}
      </button>

      {/* Polite, not assertive: the person may still be typing elsewhere, and
          this never steals focus or interrupts. */}
      <p role="status" aria-live="polite" id={statusId} className="mt-app-sm text-app-sm">
        {outcome.kind === 'done' && (
          <span
            className={
              outcome.message === 'assist.filled' ? 'text-app-charcoal' : 'text-app-granite'
            }
          >
            {t(outcome.message)}
          </span>
        )}
      </p>
    </section>
  );
}

/**
 * Server values -> draft patch.
 *
 * Allow-listed field by field rather than spread. The server registry already
 * bounds what the model may write, and this bounds it again on the way in:
 * two cheap checks around the one place where model output reaches application
 * state, and neither of them is the kind of thing you want to be relying on a
 * remote package's version pin for.
 */
function toDraftPatch(values: Record<string, unknown>, now: Date): Partial<ReportDraft> {
  const patch: Partial<ReportDraft> = {};

  for (const name of TEXT_FIELDS) {
    const value = values[name];
    if (typeof value === 'string' && value.trim()) patch[name] = value.trim();
  }

  if (typeof values.category === 'string' && values.category) patch.category = values.category;
  if (typeof values.area === 'string' && values.area) patch.area = values.area;

  // `minutesAgo` is not a draft field: it is converted here, by the same
  // helper the quick-offset buttons use, so there is exactly one place that
  // turns "how long ago" into an instant.
  const minutes = values.minutesAgo;
  if (typeof minutes === 'number' && Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440) {
    patch.at = offsetToIso(now, minutes);
  }

  return patch;
}
