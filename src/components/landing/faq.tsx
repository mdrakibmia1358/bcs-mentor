import { faqs } from "@/content/landing";
import { Icon } from "@/components/ui/icon";

export function Faq() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="page-container section-space grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20"
    >
      <div>
        <p className="eyebrow mb-3">কিছু সাধারণ প্রশ্ন</p>
        <h2 id="faq-heading" className="section-heading">
          শুরু করার আগে
          <br />
          জেনে নিন।
        </h2>
        <p className="mt-5 max-w-xs text-sm leading-8 text-muted">
          BCS Mentor-এর এই প্রথম সংস্করণে কী আছে, কীভাবে ঘুরে দেখবেন—তার কিছু
          উত্তর।
        </p>
      </div>
      <div className="border-t border-line">
        {faqs.map((faq) => (
          <details key={faq.question} className="group border-b border-line">
            <summary className="flex min-h-19 cursor-pointer list-none items-center justify-between gap-5 py-5 text-base font-medium text-forest">
              {faq.question}
              <Icon
                name="chevron"
                className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
              />
            </summary>
            <p className="max-w-xl pb-6 pr-4 text-sm leading-8 text-muted">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
