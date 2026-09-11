import { ConceptNotice } from '@/components/ui/ConceptNotice';

/**
 * The crew shell — a phone, and nothing else.
 *
 * `/staff` used to share a layout with the passenger app. It should not: the
 * two have opposite readers. A passenger arrives from the website, on any
 * device, deciding whether to trust this; crew are on an issued handset,
 * walking through a carriage, and every pixel spent on a site header, a
 * language switcher or a footer full of legal text is a pixel not spent on the
 * list they are working from.
 *
 * So this keeps the 430px frame and carries no marketing chrome at all. The
 * concept notice stays, because it is the one thing that must appear on every
 * screen of a build wearing someone else's trademark.
 */
export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mobile-container">
      <ConceptNotice />
      <main id="main">{children}</main>
    </div>
  );
}
