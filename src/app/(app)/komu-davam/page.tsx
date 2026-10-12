import Link from "next/link";
import { LockIcon } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { Snow } from "@/components/snow";
import { WishCard } from "@/components/wish-card";
import { EnvelopeHero } from "@/components/reveal-envelope";
import { AnimatedList, ItemTransition, PageTransition, RevealTransition } from "@/components/transitions";
import { BuyToggle } from "@/components/wish-actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getGiftee, getMe } from "@/lib/data";
import { firstName } from "@/lib/format";

export default async function GifteePage() {
  const [me, giftee] = await Promise.all([getMe(), getGiftee()]);

  if (giftee.state === "not-drawn") {
    return (
      <PageTransition>
        <Card className="items-center gap-3.5 rounded-[22px] px-6 py-16 text-center">
          <span className="flex size-21 items-center justify-center rounded-full bg-muted text-pine-700">
            <LockIcon aria-hidden="true" className="size-9" />
          </span>
          <h1 className="font-heading text-[32px] font-semibold sm:text-[34px]">Ještě nevíš, komu dáváš</h1>
          <p className="max-w-[460px] leading-relaxed text-muted-foreground">
            Losování zatím neproběhlo. Jakmile ho správce spustí, uvidíš tady seznam přání svého člověka – a nikoho
            jiného.
          </p>
          {me.is_admin && (
            <Button asChild variant="secondary">
              <Link href="/sprava">Přejít k losování</Link>
            </Button>
          )}
        </Card>
      </PageTransition>
    );
  }

  if (giftee.state === "sealed") {
    return (
      <PageTransition>
        <EnvelopeHero>
          <h1 className="font-heading text-[32px] font-semibold sm:text-[38px]">Tvoje obálka je zapečetěná</h1>
          <p className="max-w-[460px] leading-relaxed text-cream/85">
            Uvnitř je jméno člověka, kterého letos obdarováváš. Rozhlédni se, jestli se nikdo nedívá.
          </p>
        </EnvelopeHero>
      </PageTransition>
    );
  }

  const { giftee: person, wishes, bought } = giftee;
  const boughtN = wishes.filter((w) => bought.includes(w.id)).length;

  return (
    <PageTransition>
      <RevealTransition>
        <div className="flex flex-col gap-7">
          <section className="relative flex flex-wrap items-center gap-x-8 gap-y-6 overflow-hidden rounded-[22px] bg-pine-800 p-7 text-cream sm:rounded-[28px] sm:px-10 sm:py-9">
            <Snow />
            <PersonAvatar
              name={person.name}
              color={person.color}
              className="relative size-16 outline-2 outline-offset-3 outline-gold sm:size-22"
              textClassName="text-[22px] sm:text-[30px]"
            />
            <div className="relative flex min-w-0 flex-[999_1_320px] flex-col gap-1.5">
              <span className="text-[13px] font-bold tracking-[0.14em] text-gold-light uppercase">Obdarováváš</span>
              <h1 className="font-heading text-[32px] leading-[1.1] font-semibold sm:text-[42px]">{person.name}</h1>
              <p className="leading-relaxed text-cream/85">
                Tohle vidíš jen ty. Kdo dává komu, se dozví všichni až při rozbalování.
              </p>
            </div>
            <div className="relative flex flex-[1_1_220px] flex-col gap-2.5 rounded-[18px] border border-cream/15 bg-cream/8 px-5 py-[18px]">
              <div className="flex justify-between gap-3 font-bold">
                <span>Koupeno</span>
                <span>
                  {boughtN} z {wishes.length}
                </span>
              </div>
              <Progress
                value={wishes.length ? (boughtN / wishes.length) * 100 : 0}
                className="h-2 bg-cream/20 *:data-[slot=progress-indicator]:bg-gold-light"
                aria-label="Koupená přání"
              />
              <span className="text-[13px] text-cream/75">Značky „koupeno“ vidíš jen ty.</span>
            </div>
          </section>

          {wishes.length === 0 ? (
            <Card className="items-center gap-3 rounded-[22px] border border-dashed px-6 py-14 text-center ring-0">
              <h2 className="font-heading text-[26px] font-semibold">{firstName(person.name)} zatím nic nenapsal(a)</h2>
              <p className="max-w-[440px] leading-relaxed text-muted-foreground">
                Seznam se tu objeví hned, jak přibude první přání. Mrkni sem později.
              </p>
            </Card>
          ) : (
            <AnimatedList className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-[22px]">
              {wishes.map((wish, i) => {
                const isBought = bought.includes(wish.id);
                return (
                  <ItemTransition key={wish.id}>
                    <WishCard
                      wish={wish}
                      index={i}
                      bought={isBought}
                      linkLabel="Otevřít odkaz"
                      actions={<BuyToggle wishId={wish.id} bought={isBought} />}
                    />
                  </ItemTransition>
                );
              })}
            </AnimatedList>
          )}
        </div>
      </RevealTransition>
    </PageTransition>
  );
}
