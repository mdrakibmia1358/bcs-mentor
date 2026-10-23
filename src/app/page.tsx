import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Hero } from "@/components/landing/hero";
import { Subjects } from "@/components/landing/subjects";
import { PreparationGuide } from "@/components/landing/preparation-guide";
import { Faq } from "@/components/landing/faq";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <Subjects />
        <PreparationGuide />
        <Faq />
      </main>
      <SiteFooter />
    </>
  );
}
