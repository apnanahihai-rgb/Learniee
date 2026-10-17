import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
import "react-phone-number-input/style.css";
import AutoRefreshProvider from "@/features/shared/components/AutoRefreshProvider";
import OfflineBanner from "@/components/errors/OfflineBanner";

// Baloo 2 — rounded, playful display face for headings/titles.
// Kid-friendly without tipping into a "novelty" font.
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

// Nunito — a warm, rounded-terminal body face. Reads as friendly
// rather than corporate, but is common enough to stay "safe" (per
// the Parent-dashboard redesign brief: playful, not experimental).
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Learniee",
  description: "Personalized one-on-one learning, tailored to every child",
};

// Site-wide viewport: status-bar colour matches the white app headers, and on Android the keyboard resizes the layout so dvh / bottom-pinned inputs react like iOS. (Zoom stays enabled; the landing page overrides this with its own export.)
export const viewport: Viewport = {
  themeColor: "#ffffff",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${baloo.variable} ${nunito.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
         <body className="min-h-full flex flex-col" suppressHydrationWarning>
          <AutoRefreshProvider />
          <OfflineBanner />
          {children}
        </body>
    </html>
  );
}
