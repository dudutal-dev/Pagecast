import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EpisodeView } from "@/components/episode/EpisodeView";
import { getEpisode } from "@/server/services/episodes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const r = getEpisode(id);
  return { title: r.ok ? r.data.title : "פרק" };
}

export default async function EpisodePage({ params }: Params) {
  const { id } = await params;
  const r = getEpisode(id);
  if (!r.ok) notFound();
  return <EpisodeView initial={r.data} />;
}
