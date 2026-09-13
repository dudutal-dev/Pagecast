import { LibraryView } from "@/components/library/LibraryView";
import { libraryQuerySchema } from "@/lib/schemas/episode";
import { listEpisodes } from "@/server/services/episodes";
import { getSettings } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  const settings = getSettings();
  const episodes = listEpisodes(libraryQuerySchema.parse({}));
  return <LibraryView initial={episodes} podcastName={settings.podcastName} />;
}
