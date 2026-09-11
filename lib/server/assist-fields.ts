// TYPE-ONLY, deliberately. `ai-forms` is ESM-only, and a runtime import here
// puts it in the module graph of anything that reads this registry — including
// Jest, which then fails to parse it. fleet/SHARED.md records this exact
// breakage happening to AOZ. A type import is erased at compile time, so the
// registry stays plain data that any consumer can read, and the ESM package is
// reachable only from the route handler, which Jest never loads.
//
// `defineFields` is the identity function (it exists to infer a const tuple),
// so nothing is lost by not calling it — the annotation does the same work.
import type { FieldSpec } from '@bitbaum/ai-kit/forms';

import { AREAS, CATEGORIES } from '../report-options';

/**
 * What a free-text description is allowed to fill in.
 *
 * The list is SHORTER than the form, and the omissions are the design.
 *
 * **No `journeyId`, no `stationId`.** AGENTS.md rule 3: a description must
 * never outrank an identifier or a trip match. A model reading "the IC 8 from
 * Bern" and writing a journey id would be precisely that failure, dressed up
 * as convenience — it would produce a confident, specific, unverifiable trip
 * for the matcher to trust above everything else. The journey is chosen from
 * the real timetable, by a person, or it is marked unknown.
 *
 * **No `email`, no `phone`.** Contact details are the one part of this form
 * that is unambiguously personal data, and there is no version of "the model
 * misread it" that is acceptable there. A wrong journey costs a search; a
 * wrong phone number sends a stranger's recovery notice to somebody else.
 *
 * **No `at`.** Not for privacy — for arithmetic. "Just before eight this
 * morning" has to become an instant, and that needs the reader's timezone and
 * today's date, which is exactly the kind of thing a model gets subtly wrong
 * and confidently formats. `minutesAgo` is asked for instead: a plain number,
 * converted client-side by `offsetToIso`, which already exists and is already
 * tested. It is not a form field at all — it is a hint the client applies.
 *
 * The registry lives on the SERVER and the client names only a target key, so
 * a caller cannot widen this set by sending a longer field list. That is
 * `ai-forms`' design and the reason the field list is not part of the wire
 * format.
 */
export const REPORT_ASSIST_TARGET = 'report';

const FIELDS: readonly FieldSpec[] = [
  {
    name: 'category',
    label: 'Kategorie des Gegenstands',
    type: 'select',
    required: true,
    options: CATEGORIES.map((value) => ({ value })),
    hint: 'Nur einer dieser Werte. Im Zweifel "other".',
  },
  {
    name: 'description',
    label: 'Beschreibung des Gegenstands',
    type: 'textarea',
    maxLength: 500,
    hint: 'Was es ist, woran man es erkennt. Keine Kontaktdaten, keine Fahrtangaben.',
  },
  {
    name: 'colour',
    label: 'Farbe',
    type: 'text',
    maxLength: 40,
  },
  {
    name: 'identifierValue',
    label: 'Kennzeichen, Seriennummer, Gravur oder Ähnliches',
    type: 'text',
    maxLength: 120,
    hint: 'Nur übernehmen, wenn im Text ausdrücklich genannt. Nichts erfinden.',
  },
  {
    name: 'coach',
    label: 'Wagennummer',
    type: 'text',
    maxLength: 10,
  },
  {
    name: 'seat',
    label: 'Sitzplatznummer',
    type: 'text',
    maxLength: 10,
  },
  {
    name: 'area',
    label: 'Wo im Wagen',
    type: 'select',
    options: AREAS.map((value) => ({ value })),
    hint: 'Nur einer dieser Werte, sonst weglassen.',
  },
  {
    name: 'minutesAgo',
    label: 'Wie lange ist es her, in Minuten',
    type: 'number',
    min: 0,
    max: 1440,
    hint: 'Nur bei einer klaren Zeitangabe. Kein Datum, keine Uhrzeit — nur Minuten.',
  },
];

export const REPORT_ASSIST_FIELDS = FIELDS;

/** The field names the client is allowed to apply, for a belt-and-braces check. */
export const REPORT_ASSIST_FIELD_NAMES: readonly string[] = FIELDS.map((f) => f.name);
