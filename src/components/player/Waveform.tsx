"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { usePlayer } from "@/store/player";
import { getAnalyser } from "./audioElement";

/**
 * Live audio bars driven by an AnalyserNode. Falls back to a gentle idle
 * pattern when paused, and to a static pattern under prefers-reduced-motion.
 */
export function Waveform({
  bars = 28,
  className = "",
}: {
  bars?: number;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playing = usePlayer((s) => s.playing);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const analyser = playing ? getAnalyser() : null;
    const data = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const accent =
        getComputedStyle(canvas).getPropertyValue("--accent").trim() || "#C9A961";
      const gap = 3;
      const bw = Math.max(2, (w - gap * (bars - 1)) / bars);
      if (analyser && data) analyser.getByteFrequencyData(data);
      for (let i = 0; i < bars; i++) {
        let v: number;
        if (analyser && data) {
          // Spread bins over the bars, emphasize the voice band.
          const idx = Math.min(
            data.length - 1,
            Math.floor((i / bars) * data.length * 0.6),
          );
          v = (data[idx] ?? 0) / 255;
        } else if (reduce || !playing) {
          v = 0.18 + 0.12 * Math.sin(i * 0.9);
        } else {
          v = 0.25 + 0.2 * Math.sin(t / 9 + i * 0.7);
        }
        const bh = Math.max(3, v * h);
        const x = i * (bw + gap);
        ctx.fillStyle = accent;
        ctx.globalAlpha = 0.35 + v * 0.65;
        roundRect(ctx, x, (h - bh) / 2, bw, bh, bw / 2);
      }
      ctx.globalAlpha = 1;
      t++;
      if (!reduce && (playing || analyser)) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [playing, bars, reduce]);

  return <canvas ref={canvasRef} className={`h-full w-full ${className}`} aria-hidden />;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
