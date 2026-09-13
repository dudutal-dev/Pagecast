"use client";

import { usePathname } from "next/navigation";
import type { Settings } from "@/lib/schemas/settings";
import { BottomNav } from "./BottomNav";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { ToastProvider } from "@/components/ui/Toast";

const NO_NAV_PREFIXES = ["/onboarding"];

export function AppShell({
  settings,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const hideNav = NO_NAV_PREFIXES.some((p) => pathname.startsWith(p));
  return (
    <SettingsProvider initial={settings}>
      <ToastProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
          <main
            className="flex-1 pb-[calc(var(--nav-h)+env(safe-area-inset-bottom)+16px)]"
            style={hideNav ? { paddingBottom: 0 } : undefined}
          >
            {children}
          </main>
          {!hideNav && <BottomNav />}
        </div>
      </ToastProvider>
    </SettingsProvider>
  );
}
