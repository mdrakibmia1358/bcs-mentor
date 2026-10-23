import { EmptyState } from "@/components/dashboard/empty-state";
import { Icon } from "@/components/ui/icon";
import { formatDuration, formatNumber, getSubjectName } from "@/lib/dashboard";
import type { StudyTask, SubjectProgress } from "@/types/dashboard";

export type TaskFilter = "all" | "remaining" | "completed";

const filters: { value: TaskFilter; label: string }[] = [
  { value: "all", label: "সব কাজ" },
  { value: "remaining", label: "বাকি" },
  { value: "completed", label: "সম্পন্ন" },
];

interface TodaysPlanProps {
  tasks: readonly StudyTask[];
  subjects: readonly SubjectProgress[];
  completedIds: readonly string[];
  filter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  onToggle: (id: string) => void;
  onReset: () => void;
}

export function TodaysPlan({
  tasks,
  subjects,
  completedIds,
  filter,
  onFilterChange,
  onToggle,
  onReset,
}: TodaysPlanProps) {
  const completed = tasks.filter((task) =>
    completedIds.includes(task.id),
  ).length;
  const visibleTasks = tasks.filter(
    (task) =>
      filter === "all" ||
      (filter === "completed"
        ? completedIds.includes(task.id)
        : !completedIds.includes(task.id)),
  );
  const minutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0);
  const filterCount = (value: TaskFilter) =>
    value === "all"
      ? tasks.length
      : value === "completed"
        ? completed
        : tasks.length - completed;

  return (
    <section
      id="todays-plan"
      tabIndex={-1}
      aria-labelledby="plan-heading"
      className="dashboard-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="plan-heading" className="dashboard-heading">
            আজকের পড়ার পরিকল্পনা
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {formatNumber(tasks.length)}টি নমুনা কাজ · আনুমানিক{" "}
            {formatDuration(minutes)}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-leaf hover:bg-mint"
        >
          <Icon name="repeat" className="size-3.5" />
          ডেমো রিসেট
        </button>
      </div>
      <fieldset className="mt-5 flex flex-wrap gap-2">
        <legend className="sr-only">নমুনা কাজের তালিকা বেছে নিন</legend>
        {filters.map((item) => (
          <label key={item.value} className="relative cursor-pointer">
            <input
              type="radio"
              name="dashboard-task-filter"
              value={item.value}
              checked={filter === item.value}
              onChange={() => onFilterChange(item.value)}
              className="peer sr-only"
            />
            <span className="flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 py-2 text-xs text-muted peer-checked:border-forest peer-checked:bg-forest peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-forest">
              {item.label}
              <span className="font-medium">
                {formatNumber(filterCount(item.value))}
              </span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="my-5">
        <div className="mb-2 flex justify-between gap-2 text-xs text-muted">
          <span>নমুনা চেকলিস্টের অগ্রগতি</span>
          <span className="font-semibold text-forest">
            {formatNumber(completed)} / {formatNumber(tasks.length)}
          </span>
        </div>
        <progress
          className="study-progress block h-1.5 w-full overflow-hidden rounded-full"
          aria-label="নমুনা চেকলিস্টের অগ্রগতি"
          value={completed}
          max={tasks.length || 1}
        >
          {completed} / {tasks.length}
        </progress>
      </div>
      {visibleTasks.length ? (
        <ul className="space-y-2.5">
          {visibleTasks.map((task) => {
            const done = completedIds.includes(task.id);
            return (
              <li key={task.id}>
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-4 transition-colors sm:gap-4 ${done ? "border-leaf/25 bg-mint/50" : "border-line hover:border-leaf/50"}`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => onToggle(task.id)}
                    aria-describedby="task-demo-note"
                    className="peer sr-only"
                  />
                  <span
                    className={`mt-1 flex size-5 shrink-0 items-center justify-center rounded-md border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-forest ${done ? "border-forest bg-forest text-white" : "border-muted bg-white"}`}
                  >
                    {done && <Icon name="check" className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium leading-6 text-leaf">
                      {getSubjectName(subjects, task.subjectId)}
                    </span>
                    <span
                      lang={task.topicLanguage ?? "bn"}
                      className={`mt-1 block text-sm leading-7 ${done ? "text-muted line-through decoration-leaf/50" : "font-medium text-forest"}`}
                    >
                      {task.topic}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-xs leading-6 text-muted">
                      <Icon name="clock" className="size-3.5" />
                      আনুমানিক {formatDuration(task.estimatedMinutes)}
                      <span
                        className={`ml-auto shrink-0 ${done ? "text-leaf" : "text-muted"}`}
                      >
                        {done ? "সম্পন্ন" : "বাকি"}
                      </span>
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      ) : (
        <div>
          <EmptyState
            icon={filter === "remaining" && tasks.length ? "check" : "book"}
            title={
              !tasks.length
                ? "আজ কোনো নমুনা কাজ নেই"
                : filter === "remaining"
                  ? "আজকের নমুনা কাজ সব শেষ!"
                  : "এখনও কোনো নমুনা কাজ সম্পন্ন হয়নি"
            }
            description={
              !tasks.length
                ? "নতুন নমুনা কাজ যোগ করা হলে তা এখানে দেখা যাবে।"
                : filter === "remaining"
                  ? "সব কাজের তালিকা খুলে দেখুন অথবা ডেমো রিসেট করে আবার চেষ্টা করুন।"
                  : "সব কাজের তালিকা থেকে একটি কাজের পাশে টিক দিয়ে ডেমোটি দেখুন।"
            }
          />
          {!!tasks.length && (
            <button
              type="button"
              onClick={() => onFilterChange("all")}
              className="button button-outline mt-3 w-full"
            >
              সব কাজ দেখুন
            </button>
          )}
        </div>
      )}
      <p
        id="task-demo-note"
        className="mt-5 border-t border-line pt-4 text-xs leading-6 text-muted"
      >
        টিকচিহ্নের পরিবর্তন শুধু এই পাতার ডেমোতে প্রযোজ্য। এটি পড়ার সময় মাপে না,
        সিলেবাসের অগ্রগতি বদলায় না এবং রিফ্রেশের পর থাকে না।
      </p>
    </section>
  );
}
