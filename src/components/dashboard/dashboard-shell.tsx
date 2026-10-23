"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Brand } from "@/components/layout/brand";
import { Icon } from "@/components/ui/icon";

const navigation = [
  { href: "#overview", label: "এক নজরে", icon: "dashboard" },
  { href: "#todays-plan", label: "আজকের পরিকল্পনা", icon: "book" },
  { href: "#weekly-activity", label: "সাপ্তাহিক পড়াশোনা", icon: "activity" },
  { href: "#subject-progress", label: "বিষয়ভিত্তিক অগ্রগতি", icon: "target" },
  { href: "#upcoming-revisions", label: "আসন্ন রিভিশন", icon: "repeat" },
] as const;

function subscribeToHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getHash() {
  return window.location.hash || "#overview";
}
function getServerHash() {
  return "#overview";
}

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  const active = useSyncExternalStore(subscribeToHash, getHash, getServerHash);
  return (
    <ul className="space-y-1.5">
      {navigation.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            onClick={onNavigate}
            aria-current={active === item.href ? "location" : undefined}
            className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm transition-colors ${active === item.href ? "bg-mint font-semibold text-forest" : "text-muted hover:bg-paper hover:text-forest"}`}
          >
            <Icon name={item.icon} className="size-5 shrink-0" />
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [menuOpen]);

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-svh flex-col overflow-y-auto border-r border-line bg-white px-5 py-7 lg:flex">
        <Brand />
        <p className="mb-3 mt-10 px-3 text-xs text-muted">আপনার পড়ার জায়গা</p>
        <nav aria-label="ডেস্কটপ ড্যাশবোর্ড নেভিগেশন">
          <Navigation />
        </nav>
        <div className="mt-auto pt-8">
          <div className="mb-5 rounded-xl bg-mint p-4">
            <Icon name="target" className="mb-3 size-6 text-leaf" />
            <p className="text-sm font-semibold text-forest">
              ছোট লক্ষ্য, নিয়মিত চর্চা।
            </p>
            <p className="mt-2 text-xs leading-6 text-muted">
              একদিনে সব নয়। প্রতিদিন একটু করে এগিয়ে যান।
            </p>
          </div>
          <Link
            href="/"
            className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted hover:text-forest"
          >
            <Icon name="arrow" className="size-4 rotate-180" />
            প্রথম পাতায় ফিরুন
          </Link>
          <p className="mt-4 px-3 text-xs leading-6 text-muted">
            ডেমো সংস্করণ · নমুনা তথ্য
          </p>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="border-b border-line bg-white lg:hidden">
          <div className="flex min-h-20 items-center justify-between gap-3 px-4 sm:px-7">
            <Brand />
            <button
              ref={menuButton}
              type="button"
              aria-label={
                menuOpen ? "ড্যাশবোর্ড মেনু বন্ধ করুন" : "ড্যাশবোর্ড মেনু খুলুন"
              }
              aria-expanded={menuOpen}
              aria-controls="dashboard-mobile-navigation"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-line text-forest"
            >
              <Icon name={menuOpen ? "close" : "menu"} />
            </button>
          </div>
          <nav
            id="dashboard-mobile-navigation"
            aria-label="মোবাইল ড্যাশবোর্ড নেভিগেশন"
            hidden={!menuOpen}
            className="border-t border-line px-4 py-4 sm:px-7"
          >
            <Navigation onNavigate={() => setMenuOpen(false)} />
            <Link
              href="/"
              className="mt-3 flex min-h-12 items-center gap-3 rounded-lg border-t border-line px-3 pt-3 text-sm text-muted"
            >
              <Icon name="arrow" className="size-4 rotate-180" />
              প্রথম পাতায় ফিরুন
            </Link>
          </nav>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto max-w-[90rem] px-4 pb-8 pt-6 sm:px-7 lg:px-8 lg:pt-8 xl:px-10"
        >
          {children}
        </main>
        <footer className="px-4 pb-8 text-center text-xs leading-6 text-muted sm:px-7">
          BCS Mentor · ড্যাশবোর্ড ডেমো · সব তথ্য উদাহরণ
        </footer>
      </div>
    </div>
  );
}
