"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertTriangle size={32} />}
      title="משהו השתבש"
      body={error.message || "שגיאה לא צפויה. נסה לרענן."}
      action={<Button onClick={reset}>נסה שוב</Button>}
    />
  );
}
