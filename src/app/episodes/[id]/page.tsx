import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getEpisode } from "@/server/services/episodes";
import { DOMAIN_LABELS } from "@/lib/domains";
import { CardSvg } from "@/components/library/CardSvg";

export const dynamic = "force-dynamic";

/* Milestone 1 placeholder; the full episode screen (player, tabs, transcript) lands in milestone 2. */
export default async function EpisodePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = getEpisode(id);
  if (!r.ok) notFound();
  const ep = r.data;
  return (
    <article className="px-4 pt-4 md:px-6">
      <Link
        href="/"
        className="inline-flex h-11 items-center gap-1 text-sm text-muted hover:text-text"
      >
        <ArrowRight size={18} className="rtl:-scale-x-100" aria-hidden />
        לספרייה
      </Link>
      <div className="mx-auto mt-4 max-w-xs">
        <CardSvg
          svg={ep.cardSvg}
          uid={ep.id}
          className="overflow-hidden rounded-card shadow-card"
        />
      </div>
      <p className="mt-4 text-center text-xs font-medium text-accent">
        {DOMAIN_LABELS[ep.domain]}
      </p>
      <h1 className="mt-1 text-center text-2xl font-bold">{ep.title}</h1>
      <p className="mt-1 text-center text-muted">{ep.author}</p>
      <p className="prose-he mx-auto mt-6 max-w-prose text-center text-lg font-medium text-text">
        {ep.message}
      </p>
    </article>
  );
}
