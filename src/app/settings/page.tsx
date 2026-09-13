import { PageHeader } from "@/components/ui/PageHeader";
import { ThemeSection } from "@/components/settings/ThemeSection";

/* Milestone 1: only the theme switch; the rest of settings lands in milestones 3 and 5. */
export default function SettingsPage() {
  return (
    <>
      <PageHeader title="הגדרות" />
      <div className="space-y-6 px-4 pt-4 md:px-6">
        <ThemeSection />
      </div>
    </>
  );
}
