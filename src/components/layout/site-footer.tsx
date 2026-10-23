import { Brand } from "@/components/layout/brand";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-line py-9">
      <div className="page-container flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Brand />
          <p className="mt-3 text-sm text-muted">
            লক্ষ্য স্থির। প্রস্তুতি গোছানো।
          </p>
        </div>
        <nav
          aria-label="ফুটার নেভিগেশন"
          className="flex flex-wrap gap-x-6 gap-y-3"
        >
          {site.navigation.map((link) => (
            <a key={link.href} href={link.href} className="nav-link text-sm">
              {link.label}
            </a>
          ))}
        </nav>
        <p className="text-xs leading-6 text-muted">
          বাংলায় তৈরি, আপনার প্রস্তুতির জন্য।
          <br />
          <span lang="en">BCS Mentor · {new Date().getUTCFullYear()}</span>
        </p>
      </div>
    </footer>
  );
}
