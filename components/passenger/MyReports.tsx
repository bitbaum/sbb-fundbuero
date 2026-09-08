'use client';

import { ITEM_CATEGORY_CONFIG } from '@/lib/types';
import { NOTIFICATION_STATUS_CONFIG, UI_LABELS } from '@/lib/labels';
import { formatRelativeTime } from '@/lib/mock-data';
import { useDemoReports } from '@/lib/hooks';

/**
 * What this passenger reported, and how each one ended.
 *
 * The crew's answer used to reach the passenger as a four-second toast and
 * nothing else: look away, or have the phone asleep, and there was no way to
 * find out afterwards what the crew said. This is the record that outlives the
 * toast — same data, read back from the handover.
 *
 * Renders nothing before the first report, rather than an empty box explaining
 * its own emptiness on a screen the passenger opened to see their trips.
 */
export function MyReports() {
  const reports = useDemoReports();

  if (reports.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-app-sm font-medium text-app-granite mb-3">{UI_LABELS.myReports.title}</h2>
      <ul className="space-y-2">
        {reports.map((report) => {
          const status = NOTIFICATION_STATUS_CONFIG[report.status];
          const category = ITEM_CATEGORY_CONFIG[report.category];

          return (
            <li key={report.id} className="bg-white rounded-app-lg p-4 shadow-app-card">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {category.icon}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-app-base font-medium text-app-charcoal">
                      {report.message}
                    </h3>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-app-xs font-medium ${status.color} ${status.textColor}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <p className="text-app-sm text-app-granite mt-0.5">{report.location}</p>
                  <p className="text-app-xs text-app-granite mt-1">
                    {UI_LABELS.myReports.reportedAt} {formatRelativeTime(report.createdAt)}
                    {report.passengerInfo?.tripRoute && ` • ${report.passengerInfo.tripRoute}`}
                  </p>

                  {report.response?.notes && (
                    <div className="mt-3 pt-3 border-t border-app-cloud">
                      <p className="text-app-xs text-app-granite mb-0.5">
                        {UI_LABELS.myReports.staffNote}
                      </p>
                      <p className="text-app-sm text-app-charcoal">{report.response.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
