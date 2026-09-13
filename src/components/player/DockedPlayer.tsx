"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { usePlayer } from "@/store/player";
import { Waveform } from "./Waveform";
import { PlayPauseButton, ProgressSlider, SkipButton, SpeedMenu } from "./PlayerControls";

/** Full controls, docked above the nav on the episode page of the loaded track. */
export function DockedPlayer() {
  const error = usePlayer((s) => s.error);
  return (
    <motion.div
      initial={{ y: 40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-2 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+8px)] z-40 mx-auto max-w-3xl"
      role="region"
      aria-label="נגן"
    >
      <div className="rounded-3xl border border-line bg-surface/95 px-4 pt-2 pb-3 shadow-float backdrop-blur-xl">
        <div className="h-8">
          <Waveform />
        </div>
        <ProgressSlider />
        <div className="mt-1 flex items-center justify-between">
          <SpeedMenu />
          <div className="flex items-center gap-3">
            <SkipButton dir="back" />
            <PlayPauseButton />
            <SkipButton dir="forward" />
          </div>
          <div className="w-14" aria-hidden />
        </div>
        {error && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={14} aria-hidden /> {error}
          </p>
        )}
      </div>
    </motion.div>
  );
}
