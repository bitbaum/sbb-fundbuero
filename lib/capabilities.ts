/**
 * What the product actually does — SSOT for every built/designed claim.
 *
 * WHY THIS IS A MODULE AND NOT PAGE COPY
 *
 * AGENTS.md rule 2: never mock an integration so that it looks live. The
 * website version of that offence is a marketing page describing a capability
 * in the present tense because the paragraph was written while the feature was
 * still planned, and then never revisited. Prose has no mechanism for going
 * stale loudly.
 *
 * So each capability names the file that would have to exist for its claim to
 * be true, and `lib/__tests__/capabilities.test.ts` checks the filesystem
 * against the claim. When passenger notification is built, its `proof` file
 * appears, the test fails, and the label has to be corrected before the commit
 * lands. The page can no longer drift ahead of the code — it can only drift
 * behind it for as long as it takes CI to run.
 */
import type { MessageKey } from './i18n';

export type CapabilityStatus =
  /** Implemented in this repository, with a file that proves it. */
  | 'built'
  /** Specified, not implemented. Must never render in the present tense. */
  | 'designed'
  /** A deliberate refusal with a documented reason — not work awaiting a roadmap. */
  | 'refused';

export type Capability = {
  readonly id: string;
  readonly status: CapabilityStatus;
  readonly titleKey: MessageKey;
  readonly noteKey: MessageKey;
  /**
   * Repository-relative path whose existence matches the status: present for
   * `built`, absent for `designed`. Omitted for `refused` — the absence of a
   * reward field is not evidenced by a file, it is evidenced by rule 6.
   */
  readonly proof?: string;
};

export const NOTIFY_CAPABILITIES: readonly Capability[] = [
  {
    id: 'crew',
    status: 'built',
    titleKey: 'site.notify.crew',
    noteKey: 'site.notify.crewNote',
    // The in-process SSE bus and the crew board it feeds. AGENTS.md rule 4
    // constrains what may travel over it: reference, category, location.
    proof: 'lib/server/events.ts',
  },
  {
    id: 'passengers',
    status: 'designed',
    titleKey: 'site.notify.passengers',
    noteKey: 'site.notify.passengersNote',
    // Nothing delivers to a passenger yet: no push subscription store, no
    // consent record, no send path. Labelling this 'built' because the idea
    // is clear is exactly the failure rule 2 names.
    proof: 'lib/server/passenger-notify.ts',
  },
  {
    id: 'public-listing',
    status: 'refused',
    titleKey: 'site.notify.public',
    noteKey: 'site.notify.publicNote',
  },
  {
    id: 'reward',
    status: 'refused',
    titleKey: 'site.notify.reward',
    noteKey: 'site.notify.rewardNote',
  },
];
