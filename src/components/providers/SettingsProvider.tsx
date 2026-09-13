"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Settings, SettingsPatch } from "@/lib/schemas/settings";
import { api } from "@/lib/api";

interface SettingsContextValue {
  settings: Settings;
  update: (patch: SettingsPatch) => Promise<Settings>;
}

const Ctx = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({
  initial,
  children,
}: {
  initial: Settings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState(initial);

  const update = useCallback(async (patch: SettingsPatch) => {
    const next = await api.patch<Settings>("/api/settings", patch);
    setSettings(next);
    if (patch.theme) document.documentElement.dataset.theme = patch.theme;
    return next;
  }, []);

  const value = useMemo(() => ({ settings, update }), [settings, update]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): SettingsContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used inside SettingsProvider");
  return v;
}
