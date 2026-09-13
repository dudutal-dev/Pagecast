"use client";

/**
 * Module-level handle to the single <audio> element and a lazily created
 * AudioContext/Analyser for the waveform. `createMediaElementSource` may only
 * be called once per element, so everything lives here.
 */
let audioEl: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;

export function registerAudioElement(el: HTMLAudioElement | null) {
  audioEl = el;
}

export function getAudioElement(): HTMLAudioElement | null {
  return audioEl;
}

/** Returns an AnalyserNode wired to the element, or null if unsupported. Call from a user gesture. */
export function getAnalyser(): AnalyserNode | null {
  if (analyser) return analyser;
  if (!audioEl) return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    const source = ctx.createMediaElementSource(audioEl);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.82;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    return analyser;
  } catch {
    return null;
  }
}

export async function resumeAudioContext() {
  if (ctx && ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch {
      /* ignore */
    }
  }
}
