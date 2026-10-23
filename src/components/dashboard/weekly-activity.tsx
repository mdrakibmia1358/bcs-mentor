import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDemoDate, formatDuration, formatNumber } from "@/lib/dashboard";
import type { StudyActivity } from "@/types/dashboard";

interface WeeklyActivityProps {
  activity: readonly StudyActivity[];
  referenceDate: string;
}

export function WeeklyActivity({
  activity,
  referenceDate,
}: WeeklyActivityProps) {
  const total = activity.reduce((sum, day) => sum + day.minutes, 0);
  const maximum = Math.max(1, ...activity.map((day) => day.minutes));

  return (
    <section
      id="weekly-activity"
      tabIndex={-1}
      aria-labelledby="activity-heading"
      className="dashboard-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="activity-heading" className="dashboard-heading">
          সপ্তাহের পড়ার সময়
        </h2>
        <span className="dashboard-tag">নমুনা</span>
      </div>
      {activity.length > 0 && (
        <p className="mt-2 text-xs leading-6 text-muted">
          {formatDemoDate(activity[0].date, { day: "numeric", month: "short" })}{" "}
          –{" "}
          {formatDemoDate(activity[activity.length - 1].date, {
            day: "numeric",
            month: "short",
          })}
        </p>
      )}
      {total > 0 ? (
        <>
          <p className="mt-4 text-xl font-semibold leading-9 text-forest">
            {formatDuration(total)}
            <span className="mt-1 block text-xs font-normal text-muted">
              এই নমুনা সপ্তাহে মোট পড়ার সময়
            </span>
          </p>
          <p className="mb-3 mt-5 text-xs text-muted">সময় (মিনিট)</p>
          <ol
            className="grid grid-cols-7 gap-2"
            aria-label="দিনভিত্তিক নমুনা পড়ার সময়"
          >
            {activity.map((day) => (
              <li key={day.date} className="min-w-0 text-center">
                <p className="mb-2 text-xs font-medium text-forest">
                  {formatNumber(day.minutes)}
                  <span className="sr-only"> মিনিট</span>
                </p>
                <div
                  aria-hidden="true"
                  className="flex h-30 items-end rounded-t-md bg-paper"
                >
                  <div
                    className={`w-full rounded-t-md ${day.date === referenceDate ? "bg-forest" : "bg-leaf"}`}
                    style={{ height: `${(day.minutes / maximum) * 100}%` }}
                  />
                </div>
                <time
                  dateTime={day.date}
                  className={`mt-3 block text-xs ${day.date === referenceDate ? "font-semibold text-forest" : "text-muted"}`}
                >
                  <span className="sr-only">
                    {formatDemoDate(day.date, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                  <span aria-hidden="true">{day.dayLabel}</span>
                </time>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-line pt-3 text-xs leading-6 text-muted">
            সাত দিনের স্থির উদাহরণ; কোনো সময় স্বয়ংক্রিয়ভাবে মাপা হচ্ছে না।
          </p>
        </>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon="activity"
            title="এই সপ্তাহে পড়ার সময় নেই"
            description="এই নমুনা সপ্তাহে কোনো সময় দেওয়া হয়নি। সময়ের উদাহরণ থাকলে দিনভিত্তিক হিসাব এখানে দেখা যাবে।"
          />
        </div>
      )}
    </section>
  );
}
