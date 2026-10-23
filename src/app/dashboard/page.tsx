import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";
import { WeeklyActivity } from "@/components/dashboard/weekly-activity";
import { SubjectProgress } from "@/components/dashboard/subject-progress";
import { UpcomingRevisions } from "@/components/dashboard/upcoming-revisions";
import { Icon } from "@/components/ui/icon";
import { dashboardDemo } from "@/content/dashboard";
import { formatDemoDate } from "@/lib/dashboard";

const description =
  "নমুনা পড়ার পরিকল্পনা, সাপ্তাহিক সময়, বিষয়ভিত্তিক অগ্রগতি ও রিভিশন নিয়ে BCS Mentor-এর শিক্ষার্থী ড্যাশবোর্ড ডেমো। এটি বাস্তব শিক্ষার্থীর তথ্য নয়।";

export const metadata: Metadata = {
  title: "শিক্ষার্থী ড্যাশবোর্ড ডেমো",
  description,
  robots: { index: false, follow: true },
  openGraph: {
    title: "BCS Mentor — ড্যাশবোর্ড ডেমো",
    description,
    type: "website",
    locale: "bn_BD",
  },
};

export default function DashboardPage() {
  return (
    <>
      <section
        id="overview"
        tabIndex={-1}
        aria-labelledby="dashboard-heading"
        className="mb-6"
      >
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-5">
          <p className="flex items-center gap-2 text-xs text-muted">
            <Icon name="dashboard" className="size-4 text-leaf" />
            পড়ার জায়গা<span aria-hidden="true">/</span>
            <span className="font-medium text-forest">ড্যাশবোর্ড</span>
          </p>
          <time
            dateTime={dashboardDemo.referenceDate}
            className="flex items-center gap-2 text-xs leading-6 text-muted"
          >
            <Icon name="calendar" className="size-4" />
            {formatDemoDate(dashboardDemo.referenceDate, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            · নমুনা দিন
          </time>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">শিক্ষার্থী ড্যাশবোর্ড</p>
            <h1
              id="dashboard-heading"
              className="text-2xl font-semibold leading-[1.5] text-forest sm:text-3xl"
            >
              আজকের প্রস্তুতি, এক নজরে।
            </h1>
            <p className="mt-2 text-sm leading-7 text-muted">
              একটি ছোট পরিকল্পনা। একটু অনুশীলন। আর নিয়মিত ফিরে দেখা।
            </p>
          </div>
          <span className="dashboard-tag mt-1">ইন্টারঅ্যাকটিভ ডেমো</span>
        </div>
        <aside
          aria-label="ডেমো তথ্যের সীমা"
          className="mt-5 flex items-start gap-3 rounded-xl border border-leaf/25 bg-mint px-4 py-3.5"
        >
          <Icon name="book" className="mt-1 size-5 shrink-0 text-leaf" />
          <p className="text-xs leading-7 text-forest">
            <strong>সব তথ্য উদাহরণ; বাস্তব শিক্ষার্থীর অগ্রগতি নয়।</strong>{" "}
            টিকচিহ্ন শুধু এই পাতায় বদলাবে। রিফ্রেশ করলে ডেমো আগের অবস্থায় ফিরবে।
          </p>
        </aside>
      </section>
      <DashboardWorkspace
        demo={dashboardDemo}
        weeklyActivity={
          <WeeklyActivity
            activity={dashboardDemo.weeklyActivity}
            referenceDate={dashboardDemo.referenceDate}
          />
        }
        subjectProgress={<SubjectProgress subjects={dashboardDemo.subjects} />}
        upcomingRevisions={
          <UpcomingRevisions
            revisions={dashboardDemo.revisions}
            subjects={dashboardDemo.subjects}
            referenceDate={dashboardDemo.referenceDate}
          />
        }
      />
    </>
  );
}
