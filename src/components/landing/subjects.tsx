import { subjects } from "@/content/landing";
import { Icon } from "@/components/ui/icon";

const toneClasses = {
  green: "bg-mint text-forest",
  blue: "bg-sky text-blue-ink",
  orange: "bg-peach text-clay",
} as const;

export function Subjects() {
  return (
    <section
      id="subjects"
      aria-labelledby="subjects-heading"
      className="page-container section-space"
    >
      <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">পড়ার জগৎ</p>
          <h2 id="subjects-heading" className="section-heading">
            চিনে নিন আপনার
            <br className="sm:hidden" /> প্রস্তুতির বিষয়গুলো।
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-7 text-muted">
          বড় বিষয়, ছোট ছোট অংশে। তালিকা খুলে
          <br className="hidden md:block" />
          কয়েকটি পরিচিত টপিক ঘুরে দেখুন।
        </p>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        {subjects.map((subject) => (
          <details
            key={subject.number}
            className="subject-item group rounded-xl border border-line bg-white transition-colors open:border-leaf/40"
          >
            <summary className="flex min-h-27 cursor-pointer list-none items-center gap-4 rounded-xl px-5 py-5 sm:px-6">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${toneClasses[subject.tone]}`}
              >
                <Icon name={subject.icon} className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-forest">
                  {subject.title}
                </span>
                <span className="mt-1.5 block text-xs leading-5 text-muted">
                  {subject.subtitle}
                </span>
              </span>
              <span
                lang="en"
                aria-hidden="true"
                className="hidden font-mono text-xs text-muted sm:block"
              >
                {subject.number}
              </span>
              <Icon
                name="chevron"
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="mx-5 border-t border-line pb-5 pt-4 sm:mx-6">
              <p className="mb-3 text-xs text-muted">যেমন, পড়তে পারেন—</p>
              <ul className="flex flex-wrap gap-2">
                {subject.topics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-md bg-paper px-3 py-2 text-xs leading-5 text-forest"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </div>
          </details>
        ))}
      </div>
      <p className="mt-5 text-xs leading-6 text-muted">
        পরিচিতিমূলক বিষয় ও টপিকের উদাহরণ। পরীক্ষার পূর্ণাঙ্গ সিলেবাসের বিকল্প
        নয়।
      </p>
    </section>
  );
}
