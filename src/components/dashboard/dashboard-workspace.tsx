"use client";

import { useState, type ReactNode } from "react";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import {
  TodaysPlan,
  type TaskFilter,
} from "@/components/dashboard/todays-plan";
import { formatNumber, getSyllabusProgress } from "@/lib/dashboard";
import type { DashboardDemo } from "@/types/dashboard";

interface DashboardWorkspaceProps {
  demo: DashboardDemo;
  weeklyActivity: ReactNode;
  subjectProgress: ReactNode;
  upcomingRevisions: ReactNode;
}

export function DashboardWorkspace({
  demo,
  weeklyActivity,
  subjectProgress,
  upcomingRevisions,
}: DashboardWorkspaceProps) {
  const initialCompleted = demo.tasks
    .filter((task) => task.completed)
    .map((task) => task.id);
  const [completedIds, setCompletedIds] = useState<string[]>(initialCompleted);
  const [filter, setFilter] = useState<TaskFilter>("all");
  const [announcement, setAnnouncement] = useState("");
  const completed = demo.tasks.filter((task) =>
    completedIds.includes(task.id),
  ).length;
  const syllabus = getSyllabusProgress(demo.subjects);
  const studiedMinutes =
    demo.weeklyActivity.find((day) => day.date === demo.referenceDate)
      ?.minutes ?? 0;

  function toggleTask(id: string) {
    const next = completedIds.includes(id)
      ? completedIds.filter((task) => task !== id)
      : [...completedIds, id];
    setCompletedIds(next);
    setAnnouncement(
      `নমুনা চেকলিস্টে ${formatNumber(next.length)} / ${formatNumber(demo.tasks.length)}টি কাজ সম্পন্ন। পরিবর্তন সংরক্ষিত হবে না।`,
    );
  }

  function resetDemo() {
    setCompletedIds(initialCompleted);
    setFilter("all");
    setAnnouncement("নমুনা চেকলিস্ট আগের অবস্থায় ফিরেছে।");
  }

  return (
    <div className="space-y-6">
      <SummaryCards
        studiedMinutes={studiedMinutes}
        dailyGoalMinutes={demo.dailyGoalMinutes}
        completedTasks={completed}
        totalTasks={demo.tasks.length}
        syllabusPercentage={syllabus.percentage}
        completedTopics={syllabus.completed}
        totalTopics={syllabus.total}
        revisionCount={
          demo.revisions.filter(
            (revision) => revision.scheduledDate >= demo.referenceDate,
          ).length
        }
      />
      <div role="status" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <TodaysPlan
          tasks={demo.tasks}
          subjects={demo.subjects}
          completedIds={completedIds}
          filter={filter}
          onFilterChange={setFilter}
          onToggle={toggleTask}
          onReset={resetDemo}
        />
        <div className="min-w-0 space-y-6">
          {weeklyActivity}
          {upcomingRevisions}
        </div>
      </div>
      {subjectProgress}
    </div>
  );
}
