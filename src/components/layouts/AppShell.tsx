"use client";

import { usePathname } from "next/navigation";
import type { Settings } from "@/lib/schemas/settings";
import { usePlayer } from "@/store/player";
import { BottomNav } from "./BottomNav";
import { SettingsProvider } from "@/components/providers/SettingsProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { GlobalPlayer } from "@/components/player/GlobalPlayer";
import { MiniPlayer } from "@/components/player/MiniPlayer";

const NO_NAV_PREFIXES = ["/onboarding"];

export function AppShell({
  settings,
  children,
}: {
  settings: Settings;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const trackId = usePlayer((s) => s.track?.episodeId ?? null);
  const hideNav = NO_NAV_PREFIXES.some((p) => pathname.startsWith(p));
  const onCurrentEpisodePage = trackId != null && pathname === `/episodes/${trackId}`;
  const miniVisible = trackId != null && !onCurrentEpisodePage && !hideNav;

  return (
    <SettingsProvider initial={settings}>
      <ToastProvider>
        <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col">
          <main
            className="flex-1"
            style={{
              paddingBottom: hideNav
                ? 0
                : `calc(var(--nav-h) + env(safe-area-inset-bottom) + ${miniVisible ? 96 : 16}px)`,
            }}
          >
            {children}
          </main>
          {!hideNav && <BottomNav />}
        </div>
        <GlobalPlayer />
        <MiniPlayer hidden={!miniVisible} />
      </ToastProvider>
    </SettingsProvider>
  );
}
