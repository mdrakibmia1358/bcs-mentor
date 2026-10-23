import { EmptyState } from "@/components/dashboard/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatNumber } from "@/lib/dashboard";
import type {
  SubjectId,
  SubjectProgress as SubjectProgressRecord,
} from "@/types/dashboard";

const subjectStyle: Record<SubjectId, { icon: IconName; tone: string }> = {
  bangla: { icon: "book", tone: "bg-mint text-forest" },
  english: { icon: "letters", tone: "bg-sky text-blue-ink" },
  bangladesh: { icon: "flag", tone: "bg-peach text-clay" },
  international: { icon: "globe", tone: "bg-sky text-blue-ink" },
  math: { icon: "calculator", tone: "bg-peach text-clay" },
  science: { icon: "science", tone: "bg-mint text-forest" },
};

export function SubjectProgress({
  subjects,
}: {
  subjects: readonly SubjectProgressRecord[];
}) {
  return (
    <section
      id="subject-progress"
      tabIndex={-1}
      aria-labelledby="subjects-progress-heading"
      className="dashboard-panel"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="subjects-progress-heading" className="dashboard-heading">
          বিষয়ভিত্তিক অগ্রগতি
        </h2>
        <span className="dashboard-tag">নমুনা সিলেবাস</span>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted">
        কোন বিষয়ে কতটা এগোনো যেতে পারে—একটি পরিচিতিমূলক উদাহরণ।
      </p>
      {subjects.length ? (
        <ul className="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2 2xl:grid-cols-3">
          {subjects.map((subject) => {
            const percentage = subject.totalTopics
              ? Math.round(
                  (subject.completedTopics / subject.totalTopics) * 100,
                )
              : 0;
            const style = subjectStyle[subject.id];
            return (
              <li key={subject.id} className="min-w-0">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${style.tone}`}
                  >
                    <Icon name={style.icon} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium leading-7 text-forest">
                      {subject.name}
                    </h3>
                    <p className="text-xs leading-6 text-muted">
                      {formatNumber(subject.completedTopics)} /{" "}
                      {formatNumber(subject.totalTopics)} টপিক
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-forest">
                    {formatNumber(percentage)}%
                  </span>
                </div>
                <progress
                  aria-label={`${subject.name}: নমুনা অগ্রগতি`}
                  value={subject.completedTopics}
                  max={subject.totalTopics || 1}
                  className="study-progress mt-3 block h-1.5 w-full overflow-hidden rounded-full"
                >
                  {percentage}%
                </progress>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-5">
          <EmptyState
            icon="target"
            title="এখনও কোনো নমুনা বিষয় নেই"
            description="বিষয় ও টপিকের উদাহরণ যোগ করা হলে অগ্রগতির চিত্র এখানে দেখা যাবে।"
          />
        </div>
      )}
      <p className="mt-6 border-t border-line pt-4 text-xs leading-6 text-muted">
        এই টপিকের সংখ্যা পূর্ণাঙ্গ বা সরকারি সিলেবাস নয়। চেকলিস্টের টিক এই স্থির
        নমুনা অগ্রগতি বদলায় না।
      </p>
    </section>
  );
}
