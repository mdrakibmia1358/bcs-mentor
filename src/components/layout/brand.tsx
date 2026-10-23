import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { site } from "@/lib/site";

export function Brand() {
  return (
    <Link
      href="/"
      aria-label={`${site.name} — প্রথম পাতা`}
      className="inline-flex shrink-0 items-center gap-2.5 rounded-sm"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-forest text-lime">
        <Icon name="book" className="size-6" />
      </span>
      <span
        lang="en"
        className="text-[1.2rem] font-bold tracking-tight text-forest"
      >
        BCS <span className="font-normal">Mentor</span>
        <span className="text-leaf">.</span>
      </span>
    </Link>
  );
}
