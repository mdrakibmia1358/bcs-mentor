import type { Metadata } from "next";
import "@fontsource-variable/noto-sans-bengali";
import "./globals.css";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: {
    default: "BCS Mentor — লক্ষ্য স্থির। প্রস্তুতি গোছানো।",
    template: "%s | BCS Mentor",
  },
  description: site.description,
  applicationName: site.name,
  openGraph: {
    title: "BCS Mentor — বাংলায় বিসিএস প্রস্তুতি",
    description: site.description,
    locale: "bn_BD",
    type: "website",
    siteName: site.name,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body className="antialiased">
        <a href="#main-content" className="skip-link">
          মূল বিষয়ে যান
        </a>
        {children}
      </body>
    </html>
  );
}
