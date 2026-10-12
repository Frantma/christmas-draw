import { Skeleton } from "@/components/ui/skeleton";

// Ukáže se okamžitě po kliknutí, než dorazí data stránky.
export default function AppLoading() {
  return (
    <div className="flex flex-col gap-7" aria-busy="true" aria-label="Načítám…">
      <div className="flex max-w-[680px] flex-col gap-3">
        <Skeleton className="h-3.5 w-28 bg-sand" />
        <Skeleton className="h-10 w-72 max-w-full bg-sand" />
        <Skeleton className="h-5 w-[min(520px,100%)] bg-sand" />
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-[22px]">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-[22px] bg-card ring-1 ring-foreground/10">
            <Skeleton className="h-44 rounded-none bg-sand" />
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-6 w-2/3 bg-sand" />
              <Skeleton className="h-4 w-full bg-sand" />
              <Skeleton className="h-4 w-4/5 bg-sand" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
