import type { Metadata } from "next";
import { VoicePicker } from "@/components/settings/VoicePicker";

export const metadata: Metadata = { title: "בחירת קול" };

export default function VoicePage() {
  return <VoicePicker />;
}
