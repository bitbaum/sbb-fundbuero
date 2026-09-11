import type { Metadata } from 'next';

import { ReportFlow } from '@/components/report/ReportFlow';
import { translate, translator } from '@/lib/i18n';
import { resolveLocale } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await resolveLocale();
  return { title: translate(locale, 'site.app.title') };
}

/**
 * The passenger app is the reporting flow. That is the whole product.
 *
 * What used to be here: five tabs impersonating an operator's own mobile app —
 * a journey planner, an EasyRide check-in, a ticket wallet, a shop, a profile
 * with payment methods — each captioned "Demo: …-Tab" and none of them doing
 * anything. It was a mock that looked live, which is the one thing this
 * repository must not ship, and it borrowed a real operator's product surface
 * to do it.
 *
 * None of that is this product. A person who has just realised their bag is
 * gone does not want a ticket wallet.
 *
 * WHY THE HEADING AND THE ASIDE ARE DESKTOP-ONLY
 *
 * Not a responsive afterthought — the two readers are in different situations.
 * On a phone this is someone on a train who has just realised, and the flow is
 * built so each step is one screenful with the action under the thumb; a title
 * and an explanatory column would push the first question below the fold and
 * cost them a scroll at the worst possible moment.
 *
 * On a laptop it is someone who arrived from the landing page and is deciding
 * whether this is real. They have the screen to spare and the question they
 * actually have — "what happens after I press send?" — is worth answering
 * beside the form rather than after it.
 */
export default async function Page() {
  const locale = await resolveLocale();
  const t = translator(locale);

  return (
    <div className="site-width py-0 md:py-app-2xl">
      <div className="grid gap-app-2xl lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <header className="hidden md:block">
            <h1 className="text-app-3xl font-bold text-app-charcoal md:text-app-4xl">
              {t('site.app.title')}
            </h1>
            <p className="site-measure mt-app-md text-app-base text-app-granite">
              {t('site.app.lead')}
            </p>
          </header>

          <div className="app-canvas md:mt-app-xl">
            <ReportFlow />
          </div>
        </div>

        {/* `lg:` not `md:` — at tablet width the form already has room, and a
            300px column beside it would squeeze the trip picker's suggestions
            into two words per line. */}
        <aside className="hidden self-start rounded-app-lg bg-app-milk p-app-lg lg:block">
          <h2 className="text-app-base font-bold text-app-charcoal">{t('site.app.asideTitle')}</h2>
          <p className="mt-app-sm text-app-sm text-app-granite">{t('site.app.asideBody')}</p>
        </aside>
      </div>
    </div>
  );
}
