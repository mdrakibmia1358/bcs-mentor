import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { Icon } from "@/components/ui/icon";

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="page-container flex min-h-svh flex-col items-center justify-center py-16 text-center"
    >
      <Brand />
      <p className="mt-12 text-sm text-leaf">৪০৪ · পাতা পাওয়া যায়নি</p>
      <h1 className="mt-5 text-3xl leading-relaxed font-bold text-forest">
        পথটা একটু বদলে গেছে।
      </h1>
      <p className="mt-4 text-sm leading-8 text-muted">
        এই ঠিকানায় কোনো পাতা নেই। প্রথম পাতায় ফিরে প্রস্তুতির পথ খুঁজে নিন।
      </p>
      <Link href="/" className="button button-primary mt-8">
        প্রথম পাতায় ফিরুন <Icon name="arrow" />
      </Link>
    </main>
  );
}
