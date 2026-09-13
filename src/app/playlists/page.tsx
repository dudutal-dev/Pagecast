import { ListMusic } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

/* Milestone 1 placeholder; playlists land in milestone 5. */
export default function PlaylistsPage() {
  return (
    <>
      <PageHeader title="מסלולים" />
      <EmptyState
        icon={<ListMusic size={32} />}
        title="בקרוב"
        body="מסלולי האזנה עם סידור בגרירה והשמעה רציפה."
      />
    </>
  );
}
