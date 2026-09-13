import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NarrateFlow } from "@/components/narration/NarrateFlow";
import { getEpisode } from "@/server/services/episodes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "הפקת קריינות" };

export default async function NarratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = getEpisode(id);
  if (!r.ok) notFound();
  return <NarrateFlow initial={r.data} />;
}
