import { EmptyState } from "@/components/dashboard/empty-state";
import { Icon } from "@/components/ui/icon";
import {
  formatDemoDate,
  formatDuration,
  formatNumber,
  getSubjectName,
} from "@/lib/dashboard";
import type { SubjectProgress, UpcomingRevision } from "@/types/dashboard";

interface UpcomingRevisionsProps {
  revisions: readonly UpcomingRevision[];
  subjects: readonly SubjectProgress[];
  referenceDate: string;
}

export function UpcomingRevisions({
  revisions,
  subjects,
  referenceDate,
}: UpcomingRevisionsProps) {
  const upcoming = revisions
    .filter((revision) => revision.scheduledDate >= referenceDate)
    .toSorted((first, second) =>
      first.scheduledDate.localeCompare(second.scheduledDate),
    );

  return (
    <section
      id="upcoming-revisions"
      tabIndex={-1}
      aria-labelledby="revision-heading"
      className="dashboard-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="revision-heading" className="dashboard-heading">
          আসন্ন রিভিশন
        </h2>
        <span className="dashboard-tag">
          {formatNumber(upcoming.length)}টি নমুনা
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted">
        নমুনা ক্যালেন্ডারে পরের দিনগুলোর প্রস্তুতি।
      </p>
      {upcoming.length ? (
        <ol className="mt-5 divide-y divide-line">
          {upcoming.map((revision) => (
            <li
              key={revision.id}
              className="flex items-start gap-3 py-4 first:pt-0 last:pb-0"
            >
              <time
                dateTime={revision.scheduledDate}
                className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-paper py-2 text-forest"
              >
                <span className="sr-only">
                  {formatDemoDate(revision.scheduledDate, {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span aria-hidden="true" className="text-lg font-semibold">
                  {formatDemoDate(revision.scheduledDate, { day: "numeric" })}
                </span>
                <span
                  aria-hidden="true"
                  className="text-[0.65rem] leading-5 text-muted"
                >
                  {formatDemoDate(revision.scheduledDate, { month: "short" })}
                </span>
              </time>
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-6 text-leaf">
                  {getSubjectName(subjects, revision.subjectId)}
                </p>
                <h3
                  lang={revision.topicLanguage ?? "bn"}
                  className="mt-1 text-sm font-medium leading-7 text-forest"
                >
                  {revision.topic}
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs leading-6 text-muted">
                  <Icon name="clock" className="size-3.5" />
                  {formatDuration(revision.estimatedMinutes)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon="repeat"
            title="সামনে কোনো নমুনা রিভিশন নেই"
            description="এই নমুনা ক্যালেন্ডারে পরবর্তী রিভিশন নির্ধারিত হলে তা এখানে দেখা যাবে।"
          />
        </div>
      )}
      <p className="mt-5 border-t border-line pt-3 text-xs leading-6 text-muted">
        স্থির নমুনা তারিখ। কোনো রিমাইন্ডার পাঠানো হয় না।
      </p>
    </section>
  );
}
