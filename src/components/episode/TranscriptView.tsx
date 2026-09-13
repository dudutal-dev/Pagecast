"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer } from "@/store/player";
import { api } from "@/lib/api";
import { findActiveSentence, type SentenceAlignment } from "@/lib/narration/alignment";
import { splitSentences, stripExpressionTags } from "@/lib/narration/sentences";

interface Props {
  episodeId: string;
  script: string;
  hasAudio: boolean;
  onPlayFrom: (t: number) => void;
}

/**
 * Transcript with the current sentence highlighted in sync with playback.
 * Uses provider alignment when available, otherwise a word-count estimate
 * ("בערך"). Tapping a sentence seeks to it.
 */
export function TranscriptView({ episodeId, script, hasAudio, onPlayFrom }: Props) {
  const [alignment, setAlignment] = useState<SentenceAlignment[] | null>(null);
  const [source, setSource] = useState<"provider" | "estimated" | null>(null);
  const [active, setActive] = useState(-1);
  const isCurrent = usePlayer((s) => s.track?.episodeId === episodeId);
  const listRef = useRef<HTMLOListElement>(null);
  const userScrolledAt = useRef(0);

  useEffect(() => {
    if (!hasAudio) return;
    let cancelled = false;
    api
      .get<{ source: "provider" | "estimated"; sentences: SentenceAlignment[] }>(
        `/api/episodes/${episodeId}/alignment`,
      )
      .then((r) => {
        if (cancelled) return;
        setAlignment(r.sentences);
        setSource(r.source);
      })
      .catch(() => {
        if (!cancelled) setAlignment(null);
      });
    return () => {
      cancelled = true;
    };
  }, [episodeId, hasAudio]);

  // Subscribe to time without re-rendering on every tick: only when the active index changes.
  useEffect(() => {
    if (!alignment || !isCurrent) {
      setActive(-1);
      return;
    }
    const compute = (t: number) => {
      const idx = findActiveSentence(alignment, t);
      setActive((prev) => (prev === idx ? prev : idx));
    };
    compute(usePlayer.getState().currentTime);
    return usePlayer.subscribe((s, prev) => {
      if (s.currentTime !== prev.currentTime) compute(s.currentTime);
    });
  }, [alignment, isCurrent]);

  // Keep the active sentence in view unless the user is reading elsewhere.
  useEffect(() => {
    if (active < 0 || !listRef.current) return;
    if (Date.now() - userScrolledAt.current < 4000) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    if (!el) return;
    // Keep the sentence in the upper third: the docked player covers the bottom of the viewport.
    const rect = el.getBoundingClientRect();
    const target = rect.top + window.scrollY - window.innerHeight * 0.3;
    if (rect.top < 120 || rect.bottom > window.innerHeight * 0.55) {
      window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    }
  }, [active]);

  useEffect(() => {
    const onScroll = () => {
      userScrolledAt.current = Date.now();
    };
    window.addEventListener("wheel", onScroll, { passive: true });
    window.addEventListener("touchmove", onScroll, { passive: true });
    return () => {
      window.removeEventListener("wheel", onScroll);
      window.removeEventListener("touchmove", onScroll);
    };
  }, []);

  const plain = useMemo(() => splitSentences(stripExpressionTags(script)), [script]);
  const sentences = alignment ?? plain.map((s) => ({ text: s.text, start: 0, end: 0 }));
  const paragraphs = useMemo(() => {
    // Group consecutive sentences by paragraph index of the plain split when lengths match; else one block.
    if (alignment && alignment.length === plain.length) {
      const groups: number[][] = [];
      plain.forEach((s, i) => {
        const g = groups[s.paragraph] ?? (groups[s.paragraph] = []);
        g.push(i);
      });
      return groups.filter(Boolean);
    }
    if (!alignment) {
      const groups: number[][] = [];
      plain.forEach((s, i) => {
        const g = groups[s.paragraph] ?? (groups[s.paragraph] = []);
        g.push(i);
      });
      return groups.filter(Boolean);
    }
    return [sentences.map((_, i) => i)];
  }, [alignment, plain, sentences]);

  return (
    <div>
      {hasAudio && source === "estimated" && (
        <p className="mb-3 text-xs text-muted">
          ההדגשה משוערת לפי קצב הקריאה, לא מדויקת למילה.
        </p>
      )}
      <ol ref={listRef} className="space-y-4">
        {paragraphs.map((group, pi) => (
          <li key={pi} className="prose-he leading-8">
            {group.map((i) => {
              const s = sentences[i]!;
              const isActive = i === active;
              const clickable = hasAudio && alignment != null;
              return (
                <span
                  key={i}
                  data-idx={i}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onPlayFrom(s.start) : undefined}
                  onKeyDown={
                    clickable
                      ? (e) => (e.key === "Enter" || e.key === " ") && onPlayFrom(s.start)
                      : undefined
                  }
                  className={`rounded-md transition-colors duration-300 ${
                    isActive
                      ? "bg-accent-soft text-text shadow-[0_0_0_4px_var(--accent-soft)]"
                      : clickable
                        ? "cursor-pointer hover:bg-surface-2"
                        : ""
                  }`}
                >
                  {s.text}{" "}
                </span>
              );
            })}
          </li>
        ))}
      </ol>
    </div>
  );
}
