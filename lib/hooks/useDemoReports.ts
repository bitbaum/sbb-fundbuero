'use client';

import { useState, useEffect } from 'react';
import { readReports, subscribeReports } from '../demo-bus';
import type { StaffNotification } from '../types';

/**
 * The reports filed from this browser, with whatever the crew answered.
 *
 * Empty until mount by design: localStorage does not exist on the server, so
 * reading it during render would make the first paint disagree with the HTML
 * Next sent. The subscription then keeps the list live — a crew answer landing
 * in the other tab updates it without a reload.
 */
export function useDemoReports(): StaffNotification[] {
  const [reports, setReports] = useState<StaffNotification[]>([]);

  useEffect(() => {
    // Loading from an external system, which is the case the
    // set-state-in-effect rule's own docs call legitimate — there is no way to
    // express "read storage on mount" without it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReports(readReports());
    return subscribeReports(setReports);
  }, []);

  return reports;
}
