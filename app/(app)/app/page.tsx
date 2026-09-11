import { ReportFlow } from '@/components/report/ReportFlow';

/**
 * The passenger app is the reporting flow. That is the whole product.
 *
 * What used to be here: five tabs impersonating an operator's own mobile app —
 * a journey planner, an EasyRide check-in, a ticket wallet, a shop, a profile
 * with payment methods — each captioned "Demo: …-Tab" and none of them doing
 * anything. It was a mock that looked live, which is the one thing this
 * repository must not ship, and it borrowed a real operator's product
 * surface to do it.
 *
 * None of that is this product. A person who has just realised their bag is
 * gone does not want a ticket wallet.
 */
export default function Page() {
  return <ReportFlow />;
}
