import type { SubjectId, SubjectProgress } from "@/types/dashboard";

const number = new Intl.NumberFormat("bn-BD");
export const formatNumber = (value: number) => number.format(value);

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${formatNumber(remainder)} মিনিট`;
  return `${formatNumber(hours)} ঘণ্টা${remainder ? ` ${formatNumber(remainder)} মিনিট` : ""}`;
}

export function formatDemoDate(
  date: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("bn-BD", {
    ...options,
    timeZone: "Asia/Dhaka",
  }).format(new Date(`${date}T00:00:00+06:00`));
}

export function getSubjectName(
  subjects: readonly SubjectProgress[],
  id: SubjectId,
): string {
  return (
    subjects.find((subject) => subject.id === id)?.name ?? "বিষয় নির্ধারিত হয়নি"
  );
}

export function getSyllabusProgress(subjects: readonly SubjectProgress[]) {
  const completed = subjects.reduce(
    (sum, subject) => sum + subject.completedTopics,
    0,
  );
  const total = subjects.reduce((sum, subject) => sum + subject.totalTopics, 0);
  return {
    completed,
    total,
    percentage: total ? Math.round((completed / total) * 100) : 0,
  };
}
