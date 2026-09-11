import { StaffBoard } from '@/components/staff/StaffBoard';

/**
 * The crew view.
 *
 * A different product from the passenger app: glanceable, high contrast,
 * usable one-handed while walking through a carriage, and honest about its own
 * connection state — crew acting on a stale list is the failure that matters,
 * and a silent stale list looks exactly like a quiet shift.
 */
export default function Page() {
  return <StaffBoard />;
}
