import Link from "next/link";
import { BookX } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <EmptyState
      icon={<BookX size={32} />}
      title="הדף לא נמצא"
      body="אולי הפרק נמחק, או שהקישור שגוי."
      action={
        <Link href="/">
          <Button variant="secondary">חזרה לספרייה</Button>
        </Link>
      }
    />
  );
}
