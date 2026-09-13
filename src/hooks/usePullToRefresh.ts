"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Touch-only pull-to-refresh for a scroll container that starts at the top of the
 * page. Returns spread-able touch handlers plus the current pull distance.
 */
export function usePullToRefresh(
  onRefresh: () => Promise<unknown> | unknown,
  threshold = 70,
) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return;
      startY.current = e.touches[0]?.clientY ?? null;
    },
    [refreshing],
  );

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (startY.current === null) return;
    const y = e.touches[0]?.clientY ?? 0;
    const d = y - startY.current;
    if (d > 0 && window.scrollY === 0) setPull(Math.min(d * 0.5, 120));
    else setPull(0);
  }, []);

  const onTouchEnd = useCallback(async () => {
    const d = pullDistance;
    startY.current = null;
    setPull(0);
    if (d >= threshold * 0.5 && !refreshing) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }, [pullDistance, threshold, refreshing, onRefresh]);

  return {
    pullDistance,
    refreshing,
    bind: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
