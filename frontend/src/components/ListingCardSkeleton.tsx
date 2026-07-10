export function ListingCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-square w-full rounded-xl bg-muted" />
      <div className="mt-3 flex items-center justify-between">
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="h-4 w-10 rounded bg-muted" />
      </div>
      <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
      <div className="mt-2 h-3 w-1/4 rounded bg-muted" />
    </div>
  );
}
