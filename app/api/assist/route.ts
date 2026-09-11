import { complete, freeChain, usableChain } from '@bitbaum/ai-kit';
import { createFormAssistHandler } from '@bitbaum/ai-kit/server';

import type { CompleteFn } from '@bitbaum/ai-kit/forms';

import { REPORT_ASSIST_FIELDS, REPORT_ASSIST_TARGET } from '@/lib/server/assist-fields';

/**
 * Turn a sentence into a filled-in form.
 *
 * The handler, the prompt and the merge come from `@bitbaum/ai-kit/forms`
 * (`ai-forms`), which five other apps in this fleet already run. fleet/SHARED.md
 * is explicit that the second implementation is the bug, and this is a textbook
 * case: "parse prose into known fields, coerce, merge without clobbering what
 * the user typed" is about 400 lines of someone else's solved problem.
 *
 * ── IT MUST BE POSSIBLE TO TELL "OFF" FROM "BROKEN" ─────────────────────────
 *
 * AGENTS.md rule 2 — never mock an integration so that it looks live — has a
 * specific shape here. If no provider key is configured, the honest answers are
 * "this feature is not switched on in this build" and "the form works exactly
 * as before". The dishonest ones are a spinner that never resolves, a generic
 * failure that reads as a bug in the form, and — worst — a plausible fill
 * produced from nothing.
 *
 * So `authorize` checks for a usable chain BEFORE any model call and returns
 * 501 Not Implemented, which is the one status that actually means "this server
 * does not have this feature". 503 would say "try again later" about something
 * that will never succeed until somebody edits an env file, and 500 would send
 * the reader looking for a bug that is not there. The client renders a distinct
 * message for it and leaves the form untouched.
 *
 * ── COST AND ABUSE ──────────────────────────────────────────────────────────
 *
 * The route is unauthenticated because the whole product is — a person who has
 * just lost a bag does not make an account first. `complete` walks only the
 * FREE chain, so the ceiling is a rate limit rather than a bill, and ai-kit
 * already tells the three kinds of 429 apart rather than retrying into a spent
 * daily budget.
 */
export const runtime = 'nodejs';

/** Is any provider actually reachable from this process's environment? */
function configured(): boolean {
  return usableChain(freeChain(), process.env).length > 0;
}

export const POST = createFormAssistHandler({
  targets: [{ key: REPORT_ASSIST_TARGET, name: 'Verlustmeldung', fields: REPORT_ASSIST_FIELDS }],

  authorize: () =>
    configured()
      ? { ok: true }
      : {
          ok: false,
          status: 501,
          error: 'assist_unconfigured',
        },

  complete: (async ({ system, prompt, maxTokens, temperature }) => {
    const result = await complete({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      maxTokens,
      temperature,
      env: process.env,
      // One link gets 20s. A person staring at a form they could have typed
      // in that time will not wait out a 30s default three vendors deep.
      timeoutMs: 20_000,
    });

    return result.text;
  }) satisfies CompleteFn,
});
