import { Icon, type IconName } from "@/components/ui/icon";
import { formatDuration, formatNumber } from "@/lib/dashboard";

interface SummaryCardsProps {
  studiedMinutes: number;
  dailyGoalMinutes: number;
  completedTasks: number;
  totalTasks: number;
  syllabusPercentage: number;
  completedTopics: number;
  totalTopics: number;
  revisionCount: number;
}

export function SummaryCards(props: SummaryCardsProps) {
  const cards: {
    label: string;
    value: string;
    detail: string;
    icon: IconName;
    tone: string;
  }[] = [
    {
      label: "আজকের পড়ার সময়",
      value: formatDuration(props.studiedMinutes),
      detail: `নমুনা লক্ষ্য ${formatDuration(props.dailyGoalMinutes)}`,
      icon: "clock",
      tone: "bg-mint text-forest",
    },
    {
      label: "সম্পন্ন কাজ",
      value: `${formatNumber(props.completedTasks)} / ${formatNumber(props.totalTasks)}`,
      detail: props.totalTasks
        ? "এই পাতার ডেমো টিকের হিসাব"
        : "আজ কোনো নমুনা কাজ নেই",
      icon: "check",
      tone: "bg-sky text-blue-ink",
    },
    {
      label: "সিলেবাসের অগ্রগতি",
      value: `${formatNumber(props.syllabusPercentage)}%`,
      detail: `${formatNumber(props.completedTopics)} / ${formatNumber(props.totalTopics)} নমুনা টপিক`,
      icon: "target",
      tone: "bg-peach text-clay",
    },
    {
      label: "আসন্ন রিভিশন",
      value: `${formatNumber(props.revisionCount)}টি`,
      detail: props.revisionCount
        ? "নমুনা ক্যালেন্ডারে নির্ধারিত"
        : "সামনে কোনো নমুনা রিভিশন নেই",
      icon: "repeat",
      tone: "bg-mint text-forest",
    },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="sr-only">
        নমুনা প্রস্তুতির সারাংশ
      </h2>
      <dl className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="min-w-0 rounded-xl border border-line bg-white p-5"
          >
            <dt className="flex items-center gap-2.5 text-xs text-muted">
              <span
                className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}
              >
                <Icon name={card.icon} className="size-4.5" />
              </span>
              {card.label}
            </dt>
            <dd className="mt-4 text-xl font-semibold leading-9 text-forest">
              {card.value}
            </dd>
            <dd className="mt-1 text-xs leading-6 text-muted">{card.detail}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
