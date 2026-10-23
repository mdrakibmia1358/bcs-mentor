import { preparationSteps } from "@/content/landing";
import { Icon } from "@/components/ui/icon";

export function PreparationGuide() {
  return (
    <section
      id="approach"
      aria-labelledby="approach-heading"
      className="bg-forest text-white"
    >
      <div className="page-container section-space">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-4 text-lime">আপনার প্রস্তুতির পথ</p>
            <h2 id="approach-heading" className="section-heading text-white">
              একদিনে সব নয়।
              <br />
              প্রতিদিন একটু করে।
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-8 text-white/75">
            ভালো প্রস্তুতির জন্য সব সময় বড় পরিকল্পনা লাগে না। দরকার ছোট একটি
            লক্ষ্য, নিয়মিত চর্চা আর ফিরে দেখার অভ্যাস।
          </p>
        </div>
        <ol className="grid gap-8 md:grid-cols-3 md:gap-10">
          {preparationSteps.map((step) => (
            <li key={step.number} className="border-t border-white/20 pt-6">
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm text-lime">ধাপ {step.number}</span>
                <Icon name={step.icon} className="size-6 text-white/55" />
              </div>
              <h3 className="mb-3 text-xl font-semibold">{step.title}</h3>
              <p className="text-sm leading-8 text-white/75">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-xl border border-white/20 bg-white/5 px-6 py-5 sm:flex-row sm:items-center">
          <p className="text-sm leading-7">
            শুরুটা কেমন হতে পারে? একটি ছোট পড়ার ছক দেখে নিন।
          </p>
          <a
            href="#study-plan"
            className="inline-flex min-h-11 shrink-0 items-center gap-3 rounded-sm text-sm font-semibold text-lime"
          >
            নমুনা পরিকল্পনা দেখুন <Icon name="arrow" className="size-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
