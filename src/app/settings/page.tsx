import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeSection } from "@/components/settings/ThemeSection";
import { VoiceSettingsSection } from "@/components/settings/VoiceSettingsSection";

/* Milestone 3: voice + theme; podcast identity, backup and stats land in milestone 5. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="הגדרות" />
      <div className="mx-auto max-w-2xl space-y-4 px-4 pt-4 md:px-6">
        <VoiceSettingsSection />
        <ThemeSection />
      </div>
    </>
  );
}
