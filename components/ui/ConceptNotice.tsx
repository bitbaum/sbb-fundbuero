import { tenant } from '@/lib/tenant';

/**
 * Renders only for tenants that carry a third-party trademark.
 *
 * A pitch build looks exactly like the real product — that is the point, and
 * it is also the risk. Anyone who reaches it outside the meeting has no way to
 * tell it is not operated by the company whose name is on it. This states so
 * on every screen; `robots: noindex` in layout.tsx keeps it out of search.
 */
export function ConceptNotice() {
  if (!tenant.isConcept) return null;

  return (
    <p
      role="note"
      className="bg-app-charcoal text-white text-app-xs text-center px-4 py-1.5 leading-snug"
    >
      {/* "von <Name>" avoids the genitive, which would require declining the
          operator's name — and the name is a free string we cannot decline. */}
      Unabhängiges Konzept — kein offizielles Produkt von {tenant.wordmark}.
    </p>
  );
}
