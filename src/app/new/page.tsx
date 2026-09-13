import { Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

/* Milestone 1 placeholder; creation flows (AI / JSON / manual) land in milestone 4. */
export default function NewEpisodePage() {
  return (
    <>
      <PageHeader title="פרק חדש" />
      <EmptyState
        icon={<Sparkles size={32} />}
        title="בקרוב"
        body="יצירה עם AI, הדבקת JSON מהצ'אט וטופס ידני יגיעו באבן הדרך הבאה."
      />
    </>
  );
}
