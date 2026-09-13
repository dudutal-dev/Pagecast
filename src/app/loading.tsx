import { CardSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="px-4 pt-6 md:px-6" aria-busy>
      <Skeleton className="mb-4 h-8 w-40" />
      <Skeleton className="mb-4 h-11 w-full rounded-2xl" />
      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i}>
            <CardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
