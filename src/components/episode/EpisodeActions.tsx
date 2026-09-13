"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Heart, Share2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { usePlayer } from "@/store/player";
import type { Episode } from "@/lib/schemas/episode";

export function EpisodeActions({
  episode,
  onChange,
}: {
  episode: Episode;
  onChange: (patch: Partial<Episode>) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const patch = async (p: Record<string, unknown>, optimistic: Partial<Episode>) => {
    onChange(optimistic);
    try {
      const updated = await api.patch<Episode>(`/api/episodes/${episode.id}`, p);
      onChange(updated);
    } catch (e) {
      toast.error("לא נשמר", e instanceof Error ? e.message : undefined);
      router.refresh();
    }
  };

  const toggleDone = async () => {
    const status = episode.status === "done" ? "new" : "done";
    onChange({ status });
    try {
      await api.patch(`/api/episodes/${episode.id}/progress`, { status });
      toast.success(status === "done" ? "סומן כהושמע" : "סומן כחדש");
    } catch {
      onChange({ status: episode.status });
      toast.error("לא נשמר");
    }
  };

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `${episode.title} · ${episode.author}\n\n${episode.message}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: episode.title, text, url });
        return;
      }
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success("הועתק ללוח");
    } catch (e) {
      if ((e as Error).name !== "AbortError") toast.error("השיתוף לא הצליח");
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api.delete(`/api/episodes/${episode.id}`);
      if (usePlayer.getState().track?.episodeId === episode.id)
        usePlayer.getState().clear();
      toast.success("הפרק נמחק");
      router.replace("/");
      router.refresh();
    } catch (e) {
      toast.error("המחיקה נכשלה", e instanceof Error ? e.message : undefined);
      setDeleting(false);
      setConfirm(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center gap-1">
        <IconButton
          label={episode.favorite ? "הסר ממועדפים" : "הוסף למועדפים"}
          active={episode.favorite}
          onClick={() =>
            void patch({ favorite: !episode.favorite }, { favorite: !episode.favorite })
          }
        >
          <Heart
            size={22}
            fill={episode.favorite ? "currentColor" : "none"}
            aria-hidden
          />
        </IconButton>
        <IconButton
          label={episode.status === "done" ? "סמן כלא הושמע" : "סמן כהושמע"}
          active={episode.status === "done"}
          onClick={() => void toggleDone()}
        >
          <CheckCircle2 size={22} aria-hidden />
        </IconButton>
        <IconButton label="שתף" onClick={() => void share()}>
          <Share2 size={22} aria-hidden />
        </IconButton>
        <IconButton
          label="מחק פרק"
          onClick={() => setConfirm(true)}
          className="hover:text-danger"
        >
          <Trash2 size={22} aria-hidden />
        </IconButton>
      </div>
      <ConfirmDialog
        open={confirm}
        title="למחוק את הפרק?"
        body="הטקסט, ההערות והקריינות יימחקו. אי אפשר לשחזר."
        confirmLabel="מחק"
        danger
        loading={deleting}
        onConfirm={() => void remove()}
        onClose={() => setConfirm(false)}
      />
    </>
  );
}
