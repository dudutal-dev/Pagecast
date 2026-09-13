import type { Metadata, Viewport } from "next";
import { Heebo, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layouts/AppShell";
import { getSettings } from "@/server/services/settings";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heebo",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Pagecast", template: "%s · Pagecast" },
  description: "פודקאסט הספרים האישי שלך: תקצירים עם מסר, בקול אנושי.",
  applicationName: "Pagecast",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Pagecast" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#14110F" },
    { media: "(prefers-color-scheme: light)", color: "#F5F0E8" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = getSettings();
  return (
    <html
      lang="he"
      dir="rtl"
      data-theme={settings.theme}
      className={`${heebo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body>
        <AppShell settings={settings}>{children}</AppShell>
      </body>
    </html>
  );
}
