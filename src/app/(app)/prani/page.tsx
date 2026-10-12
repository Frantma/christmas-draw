import { PageHead } from "@/components/page-head";
import { ItemTransition, PageTransition } from "@/components/transitions";
import { WishCard, WishPlaceholder } from "@/components/wish-card";
import { AddWishButton, AddWishTile, MyWishActions } from "@/components/wish-actions";
import { Card } from "@/components/ui/card";
import { getMyWishes } from "@/lib/data";

export default async function MyWishesPage() {
  const wishes = await getMyWishes();

  return (
    <PageTransition>
      <div className="flex flex-col gap-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageHead eyebrow={`${wishes.length} přání`} title="Moje přání">
            Napiš, co by tě potěšilo. Seznam uvidí jen ten, kdo si tě vylosuje.
          </PageHead>
          <AddWishButton className="w-full sm:w-auto" />
        </div>

        {wishes.length === 0 ? (
          <Card className="items-center gap-3.5 rounded-[22px] border border-dashed px-6 py-14 text-center ring-0">
            <WishPlaceholder index={0} className="size-21 rounded-full [&_svg]:size-9.5" />
            <h2 className="font-heading text-[26px] font-semibold">Seznam je zatím prázdný</h2>
            <p className="max-w-[420px] leading-relaxed text-muted-foreground">
              Přidej první přání – stačí název. Popis, odkaz a obrázek pomůžou trefit se přesně.
            </p>
            <AddWishButton variant="secondary" icon={false}>
              Přidat první přání
            </AddWishButton>
          </Card>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-[22px]">
            {wishes.map((wish, i) => (
              <ItemTransition key={wish.id}>
                <WishCard wish={wish} index={i} actions={<MyWishActions wish={wish} />} />
              </ItemTransition>
            ))}
            <ItemTransition>
              <AddWishTile />
            </ItemTransition>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
