"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BookOpenText, Plus, Search, SearchX, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { DOMAIN_IDS, DOMAIN_LABELS, type DomainId } from "@/lib/domains";
import type { EpisodeCard as EpisodeCardData, LibrarySort } from "@/lib/schemas/episode";
import { api, toQuery } from "@/lib/api";
import { Chip } from "@/components/ui/Chip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { EpisodeCard } from "./EpisodeCard";
import { SortMenu } from "./SortMenu";

interface Props {
  initial: EpisodeCardData[];
  podcastName: string;
}

const STORAGE_KEY = "pagecast:library-filters";

export function LibraryView({ initial, podcastName }: Props) {
  const toast = useToast();
  const [episodes, setEpisodes] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<DomainId | undefined>();
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [hydrated, setHydrated] = useState(false);
  const firstRun = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);

  // Restore lightweight per-device filter preferences.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw) as { domain?: DomainId; sort?: LibrarySort };
        if (s.domain && (DOMAIN_IDS as readonly string[]).includes(s.domain))
          setDomain(s.domain);
        if (s.sort) setSort(s.sort);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ domain, sort }));
    } catch {
      /* ignore */
    }
  }, [domain, sort, hydrated]);

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const data = await api.get<EpisodeCardData[]>(
          `/api/episodes${toQuery({ q, domain, sort })}`,
        );
        setEpisodes(data);
      } catch (e) {
        toast.error(
          "לא הצלחנו לטעון את הספרייה",
          e instanceof Error ? e.message : undefined,
        );
      } finally {
        setLoading(false);
      }
    },
    [q, domain, sort, toast],
  );

  // Debounced reload on filter change (skip the very first render: we have SSR data).
  useEffect(() => {
    if (!hydrated) return;
    if (firstRun.current) {
      firstRun.current = false;
      if (!domain && sort === "newest" && !q) return;
    }
    const t = window.setTimeout(() => void load(), q ? 250 : 0);
    return () => window.clearTimeout(t);
  }, [q, domain, sort, hydrated, load]);

  const { pullDistance, refreshing, bind } = usePullToRefresh(() =>
    load({ silent: true }),
  );

  const hasFilters = Boolean(q || domain);
  const isEmptyLibrary = !hasFilters && episodes.length === 0 && !loading;
  const count = useMemo(() => episodes.length, [episodes]);

  return (
    <div {...bind} className="min-h-dvh">
      <PageHeader
        title={podcastName}
        subtitle={count > 0 ? `${count} פרקים בספרייה` : "הספרייה שלך"}
      >
        <div className="px-4 pb-3 md:px-6">
          <label className="relative block">
            <span className="sr-only">חיפוש בספרייה</span>
            <Search
              size={18}
              className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="search"
              inputMode="search"
              enterKeyHint="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="חפש כותר, מחבר או מסר…"
              className="h-11 w-full rounded-2xl border border-line bg-surface ps-10 pe-10 text-[15px] text-text placeholder:text-muted-2 focus:border-line-strong focus:outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  searchRef.current?.focus();
                }}
                aria-label="נקה חיפוש"
                className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-text"
              >
                <X size={16} aria-hidden />
              </button>
            )}
          </label>
        </div>
        <div className="flex items-center gap-2 ps-4 pe-2 pb-3 md:ps-6">
          <div
            role="radiogroup"
            aria-label="סינון לפי תחום"
            className="no-scrollbar -ms-4 flex flex-1 gap-2 overflow-x-auto ps-4 pe-6 md:-ms-6 md:ps-6"
            style={{
              maskImage: "linear-gradient(to left, black calc(100% - 28px), transparent)",
              WebkitMaskImage:
                "linear-gradient(to left, black calc(100% - 28px), transparent)",
            }}
          >
            <Chip selected={!domain} onClick={() => setDomain(undefined)}>
              הכול
            </Chip>
            {DOMAIN_IDS.map((d) => (
              <Chip key={d} selected={domain === d} onClick={() => setDomain(d)}>
                {DOMAIN_LABELS[d]}
              </Chip>
            ))}
          </div>
          <SortMenu value={sort} onChange={setSort} />
        </div>
      </PageHeader>

      {/* Pull-to-refresh indicator */}
      <div
        aria-hidden
        className="flex items-center justify-center overflow-hidden text-xs text-muted transition-[height]"
        style={{ height: refreshing ? 36 : Math.min(pullDistance, 60) * 0.6 }}
      >
        {refreshing ? "מרענן…" : pullDistance > 70 ? "שחרר לרענון" : "משוך לרענון"}
      </div>

      <section aria-label="פרקים" className="px-4 pt-3 md:px-6">
        {loading && episodes.length === 0 ? (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i}>
                <CardSkeleton />
              </li>
            ))}
          </ul>
        ) : isEmptyLibrary ? (
          <EmptyState
            icon={<BookOpenText size={34} strokeWidth={1.6} />}
            title="עדיין אין פרקים"
            body="הדבק פרק מהצ'אט, צור אחד עם AI, או הזן ידנית. הפרק הראשון לוקח דקה."
            action={
              <Link href="/new">
                <Button size="lg" icon={<Plus size={18} aria-hidden />}>
                  צור פרק ראשון
                </Button>
              </Link>
            }
          />
        ) : episodes.length === 0 ? (
          <EmptyState
            icon={<SearchX size={34} strokeWidth={1.6} />}
            title="לא נמצאו פרקים"
            body="נסה מילת חיפוש אחרת או הסר את הסינון."
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  setQ("");
                  setDomain(undefined);
                }}
              >
                נקה סינון
              </Button>
            }
          />
        ) : (
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.ul
              key={`${domain ?? "all"}-${sort}`}
              className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4"
              style={{ opacity: loading ? 0.6 : 1, transition: "opacity 150ms" }}
            >
              {episodes.map((ep, i) => (
                <EpisodeCard key={ep.id} episode={ep} index={i} />
              ))}
            </motion.ul>
          </AnimatePresence>
        )}
      </section>

      {/* Floating action button */}
      {!isEmptyLibrary && (
        <Link
          href="/new"
          aria-label="פרק חדש"
          className="fixed end-4 bottom-[calc(var(--nav-h)+env(safe-area-inset-bottom)+16px)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-float transition-transform hover:bg-accent-2 active:scale-95 md:end-6"
        >
          <Plus size={26} strokeWidth={2.4} aria-hidden />
        </Link>
      )}
    </div>
  );
}
