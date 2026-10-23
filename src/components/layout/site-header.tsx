"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/layout/brand";
import { Icon } from "@/components/ui/icon";
import { site } from "@/lib/site";

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [menuOpen]);

  return (
    <header className="relative z-20 border-b border-line bg-paper">
      <div className="page-container flex h-21 items-center justify-between gap-4">
        <Brand />
        <nav
          aria-label="প্রধান নেভিগেশন"
          className="hidden items-center gap-8 md:flex"
        >
          {site.navigation.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}
        </nav>
        <Link
          href={site.dashboardDemo.href}
          aria-label={site.dashboardDemo.accessibleLabel}
          className="button button-outline hidden text-sm md:inline-flex"
        >
          {site.dashboardDemo.label} <Icon name="arrow" className="size-4" />
        </Link>
        <button
          ref={menuButton}
          type="button"
          aria-label={menuOpen ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex size-11 items-center justify-center rounded-lg border border-line text-forest md:hidden"
        >
          <Icon name={menuOpen ? "close" : "menu"} />
        </button>
      </div>
      <nav
        id="mobile-navigation"
        aria-label="মোবাইল নেভিগেশন"
        hidden={!menuOpen}
        className="border-t border-line bg-paper md:hidden"
      >
        <div className="page-container flex flex-col gap-1 py-4">
          {site.navigation.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="nav-link rounded-lg px-3 py-3"
            >
              {link.label}
            </a>
          ))}
          <Link
            href={site.dashboardDemo.href}
            aria-label={site.dashboardDemo.accessibleLabel}
            onClick={() => setMenuOpen(false)}
            className="button button-primary mt-2"
          >
            {site.dashboardDemo.label} <Icon name="arrow" className="size-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}
