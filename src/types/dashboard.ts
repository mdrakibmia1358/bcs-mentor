export type SubjectId =
  "bangla" | "english" | "bangladesh" | "international" | "math" | "science";

export interface SubjectProgress {
  readonly id: SubjectId;
  readonly name: string;
  readonly completedTopics: number;
  readonly totalTopics: number;
}

export interface StudyTask {
  readonly id: string;
  readonly subjectId: SubjectId;
  readonly topic: string;
  readonly topicLanguage?: "bn" | "en";
  readonly estimatedMinutes: number;
  readonly completed: boolean;
}

export interface StudyActivity {
  readonly date: string;
  readonly dayLabel: string;
  readonly minutes: number;
}

export interface UpcomingRevision {
  readonly id: string;
  readonly subjectId: SubjectId;
  readonly topic: string;
  readonly topicLanguage?: "bn" | "en";
  readonly scheduledDate: string;
  readonly estimatedMinutes: number;
}

export interface DashboardDemo {
  readonly referenceDate: string;
  readonly dailyGoalMinutes: number;
  readonly subjects: readonly SubjectProgress[];
  readonly tasks: readonly StudyTask[];
  readonly weeklyActivity: readonly StudyActivity[];
  readonly revisions: readonly UpcomingRevision[];
}
