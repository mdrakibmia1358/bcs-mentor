import type { DashboardDemo } from "@/types/dashboard";

// Fixed, illustrative records. These are not a learner's activity or an official syllabus.
export const dashboardDemo: DashboardDemo = {
  referenceDate: "2026-10-24",
  dailyGoalMinutes: 180,
  subjects: [
    {
      id: "bangla",
      name: "বাংলা ভাষা ও সাহিত্য",
      completedTopics: 10,
      totalTopics: 20,
    },
    {
      id: "english",
      name: "ইংরেজি ভাষা ও সাহিত্য",
      completedTopics: 6,
      totalTopics: 20,
    },
    {
      id: "bangladesh",
      name: "বাংলাদেশ বিষয়াবলি",
      completedTopics: 12,
      totalTopics: 25,
    },
    {
      id: "international",
      name: "আন্তর্জাতিক বিষয়াবলি",
      completedTopics: 4,
      totalTopics: 20,
    },
    { id: "math", name: "গাণিতিক যুক্তি", completedTopics: 7, totalTopics: 20 },
    {
      id: "science",
      name: "বিজ্ঞান ও প্রযুক্তি",
      completedTopics: 3,
      totalTopics: 15,
    },
  ],
  tasks: [
    {
      id: "math-percentages",
      subjectId: "math",
      topic: "শতকরা ও অনুপাত",
      estimatedMinutes: 30,
      completed: true,
    },
    {
      id: "bangla-grammar",
      subjectId: "bangla",
      topic: "সমাস ও সন্ধি",
      estimatedMinutes: 25,
      completed: true,
    },
    {
      id: "english-agreement",
      subjectId: "english",
      topic: "Subject–verb agreement",
      topicLanguage: "en",
      estimatedMinutes: 25,
      completed: false,
    },
    {
      id: "bangladesh-history",
      subjectId: "bangladesh",
      topic: "ভাষা আন্দোলন ও গণঅভ্যুত্থান",
      estimatedMinutes: 35,
      completed: false,
    },
    {
      id: "science-computers",
      subjectId: "science",
      topic: "কম্পিউটারের মৌলিক ধারণা",
      estimatedMinutes: 20,
      completed: false,
    },
  ],
  weeklyActivity: [
    { date: "2026-10-18", dayLabel: "রবি", minutes: 75 },
    { date: "2026-10-19", dayLabel: "সোম", minutes: 110 },
    { date: "2026-10-20", dayLabel: "মঙ্গল", minutes: 0 },
    { date: "2026-10-21", dayLabel: "বুধ", minutes: 95 },
    { date: "2026-10-22", dayLabel: "বৃহঃ", minutes: 140 },
    { date: "2026-10-23", dayLabel: "শুক্র", minutes: 60 },
    { date: "2026-10-24", dayLabel: "শনি", minutes: 95 },
  ],
  revisions: [
    {
      id: "revision-bangla",
      subjectId: "bangla",
      topic: "বাগ্‌ধারা ও প্রবাদ",
      scheduledDate: "2026-10-25",
      estimatedMinutes: 15,
    },
    {
      id: "revision-bangladesh",
      subjectId: "bangladesh",
      topic: "সংবিধানের মৌলিক ধারণা",
      scheduledDate: "2026-10-26",
      estimatedMinutes: 20,
    },
    {
      id: "revision-english",
      subjectId: "english",
      topic: "Vocabulary: common word pairs",
      topicLanguage: "en",
      scheduledDate: "2026-10-27",
      estimatedMinutes: 15,
    },
  ],
};
