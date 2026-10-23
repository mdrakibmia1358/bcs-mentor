"use client";

import { useState } from "react";
import { studyDays } from "@/content/landing";
import { Icon } from "@/components/ui/icon";

const banglaNumber = new Intl.NumberFormat("bn-BD");

export function StudyPlan() {
  const [dayIndex, setDayIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const day = studyDays[dayIndex];
  const finished = day.tasks.filter((task) =>
    completed.includes(task.id),
  ).length;
  const totalMinutes = day.tasks.reduce((sum, task) => sum + task.minutes, 0);
  const percentage = Math.round((finished / day.tasks.length) * 100);

  function toggleTask(id: string) {
    setCompleted((current) =>
      current.includes(id)
        ? current.filter((task) => task !== id)
        : [...current, id],
    );
  }

  return (
    <div id="study-plan" className="study-desk scroll-mt-8">
      <div className="mb-4 flex items-center justify-between gap-3 px-1 text-xs font-medium text-muted">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-leaf" />
          আপনার ছোট্ট স্টাডি ডেস্ক
        </span>
        <span className="rounded-full border border-line px-2.5 py-1">
          নমুনা পরিকল্পনা
        </span>
      </div>
      <section
        aria-labelledby="plan-heading"
        className="overflow-hidden rounded-2xl border border-line bg-white shadow-desk"
      >
        <div className="flex items-start justify-between gap-4 bg-forest px-6 py-6 text-white sm:px-7">
          <div>
            <p className="mb-2 text-xs text-white/75">ছোট লক্ষ্য, প্রতিদিন</p>
            <h2 id="plan-heading" className="text-xl font-semibold">
              আজ একটু এগিয়ে যাই
            </h2>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/25 text-lime">
            <Icon name="sun" className="size-6" />
          </span>
        </div>
        <div className="p-5 sm:p-7">
          <fieldset className="mb-6 flex gap-2 rounded-xl bg-paper p-1.5">
            <legend className="sr-only">নমুনা পরিকল্পনার দিন বেছে নিন</legend>
            {studyDays.map((item, index) => (
              <label key={item.id} className="relative flex-1 cursor-pointer">
                <input
                  type="radio"
                  name="study-day"
                  value={item.id}
                  checked={dayIndex === index}
                  onChange={() => setDayIndex(index)}
                  className="peer sr-only"
                />
                <span className="block rounded-lg px-3 py-2.5 text-center text-sm text-muted transition-colors peer-checked:bg-white peer-checked:font-semibold peer-checked:text-forest peer-checked:shadow-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-forest">
                  {item.label}
                </span>
              </label>
            ))}
          </fieldset>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-forest">{day.focus}</h3>
            <span className="flex items-center gap-1 text-xs text-muted">
              <Icon name="clock" className="size-3.5" />
              {banglaNumber.format(totalMinutes)} মিনিট
            </span>
          </div>
          <div className="space-y-2.5">
            {day.tasks.map((task) => {
              const isDone = completed.includes(task.id);
              return (
                <label
                  key={task.id}
                  className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${isDone ? "border-leaf/30 bg-mint/60" : "border-line hover:border-leaf/40"}`}
                >
                  <input
                    type="checkbox"
                    checked={isDone}
                    onChange={() => toggleTask(task.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-md border peer-focus-visible:outline-2 peer-focus-visible:outline-offset-3 peer-focus-visible:outline-forest ${isDone ? "border-forest bg-forest text-white" : "border-muted bg-white"}`}
                  >
                    {isDone && <Icon name="check" className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm font-medium ${isDone ? "text-muted line-through decoration-leaf/50" : "text-ink"}`}
                    >
                      {task.subject}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      {task.topic}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {banglaNumber.format(task.minutes)} মি.
                  </span>
                </label>
              );
            })}
          </div>
          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-2.5 flex items-center justify-between gap-3 text-xs">
              <span role="status" className="text-muted">
                {finished === day.tasks.length
                  ? "দারুণ! আজকের নমুনা লক্ষ্য পূরণ।"
                  : "আপনার ছোট ছোট পদক্ষেপ"}
              </span>
              <span className="font-semibold text-forest">
                {banglaNumber.format(finished)}/
                {banglaNumber.format(day.tasks.length)} সম্পন্ন
              </span>
            </div>
            <progress
              aria-label={`${day.label}: সম্পন্ন পড়া`}
              value={finished}
              max={day.tasks.length}
              className="study-progress block h-2 w-full overflow-hidden rounded-full"
            >
              {percentage}%
            </progress>
          </div>
        </div>
      </section>
      <p className="mt-4 text-center text-xs leading-6 text-muted">
        দিন বদলে দেখুন, পড়ায় টিক দিন। এটি সংরক্ষিত হবে না।
      </p>
      <div aria-hidden="true" className="desk-note">
        <Icon name="check" className="size-4 text-forest" />
        <span>
          একদিনে সব নয়,
          <br />
          প্রতিদিন একটু করে।
        </span>
      </div>
    </div>
  );
}
