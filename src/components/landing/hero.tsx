import { StudyPlan } from "@/components/landing/study-plan";
import { Icon } from "@/components/ui/icon";

const habits = [
  { icon: "target", title: "পরিকল্পনা", text: "কী পড়বেন, আগে ঠিক করুন" },
  { icon: "pen", title: "অনুশীলন", text: "বুঝে পড়ুন, নিজেকে যাচাই করুন" },
  { icon: "repeat", title: "রিভিশন", text: "পড়া মনে রাখতে ফিরে দেখুন" },
] as const;

export function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="hero-surface border-b border-line"
    >
      <div className="page-container grid items-center gap-12 pb-14 pt-12 md:pb-20 md:pt-18 lg:grid-cols-[1.08fr_1fr] lg:gap-18 lg:pb-24 lg:pt-22">
        <div>
          <p className="eyebrow mb-6">
            <span className="size-2 rounded-full bg-leaf" />
            বাংলায় ভাবুন। গুছিয়ে পড়ুন।
          </p>
          <h1
            id="hero-heading"
            className="text-[2.6rem] leading-[1.42] font-bold text-forest sm:text-5xl sm:leading-[1.4] xl:text-[3.7rem]"
          >
            লক্ষ্য যখন বিসিএস,
            <br />
            প্রস্তুতি হোক
            <br />
            <span className="relative inline-block text-leaf">
              গোছানো।
              <span aria-hidden="true" className="hero-underline" />
            </span>
          </h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-muted sm:text-lg sm:leading-9">
            বড় সিলেবাসকে ছোট ছোট লক্ষ্যে ভাগ করুন। পড়া, অনুশীলন আর
            রিভিশন—প্রস্তুতির পথটা হোক নিজের গতিতে, একটি পরিষ্কার পরিকল্পনায়।
          </p>
          <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
            <a href="#study-plan" className="button button-primary">
              প্রস্তুতির ছক দেখুন <Icon name="arrow" />
            </a>
            <a
              href="#subjects"
              className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-medium text-forest"
            >
              বিষয়গুলো ঘুরে দেখুন{" "}
              <Icon
                name="arrow"
                className="size-4 transition-transform group-hover:translate-x-1"
              />
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="check" className="size-3.5 text-leaf" />
              বাংলা আগে
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check" className="size-3.5 text-leaf" />
              নিজের গতিতে
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check" className="size-3.5 text-leaf" />
              ছোট লক্ষ্য, নিয়মিত চর্চা
            </span>
          </div>
        </div>
        <StudyPlan />
      </div>
      <div className="border-t border-line bg-white/45">
        <div className="page-container grid gap-5 py-6 sm:grid-cols-[1.2fr_1fr_1fr_1fr] sm:items-center sm:gap-6">
          <p className="text-sm font-medium text-forest">
            ভালো প্রস্তুতির শুরু
            <br className="hidden sm:block" />
            একটি ভালো অভ্যাসে।
          </p>
          {habits.map((item) => (
            <div
              key={item.title}
              className="flex items-center gap-3 sm:border-l sm:border-line sm:pl-5"
            >
              <Icon name={item.icon} className="size-6 shrink-0 text-leaf" />
              <div>
                <p className="text-sm font-semibold text-forest">
                  {item.title}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
