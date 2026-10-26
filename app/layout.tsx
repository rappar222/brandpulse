import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { FeedbackWidget } from "@/components/FeedbackWidget";
import { UniversalTruncateExpander } from "@/components/UniversalTruncateExpander";
import { ScrollToTop } from "@/components/ScrollToTop";

const sansFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

const monoFont = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "PulsarCheck — Brand & Domain Availability Engine",
  description:
    "Instantly check domain availability, 12+ social networks, developer package registries, and trademark conflicts in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sansFont.variable} ${monoFont.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
        {children}
        <FeedbackWidget />
        <UniversalTruncateExpander />
        <ScrollToTop />
      </body>
    </html>
  );
}
