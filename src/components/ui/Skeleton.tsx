export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-xl bg-surface-2 ${className}`}
      style={{ animationDuration: "1.6s" }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      <Skeleton className="aspect-[3/4] w-full rounded-card" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
