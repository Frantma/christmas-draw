import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, GiftIcon, LockIcon, UsersIcon, WalletIcon } from "lucide-react";
import { Eyebrow, StarMark } from "@/components/brand";
import { PersonAvatar } from "@/components/person-avatar";
import { Snow } from "@/components/snow";
import { AddWishButton, RevealButton } from "@/components/wish-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDrawStatus, getGiftee, getMe, getMembers, getMyWishes, getSettings } from "@/lib/data";
import { daysToChristmas, firstName, participantsText, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export default async function OverviewPage() {
  const [me, members, settings, status, giftee, myWishes] = await Promise.all([
    getMe(),
    getMembers(),
    getSettings(),
    getDrawStatus(),
    getGiftee(),
    getMyWishes(),
  ]);

  const days = daysToChristmas();
  const heroText =
    giftee.state === "not-drawn"
      ? "Losování ještě neproběhlo. Mezitím si sepiš přání, ať to má tvůj Ježíšek snazší."
      : giftee.state === "sealed"
        ? "Losování je hotové a tvoje obálka čeká. Otevři ji, až se nikdo nebude dívat."
        : `Letos obdarováváš ${firstName(giftee.giftee.name)} (${giftee.wishes.length} přání na seznamu). Ať se ti dárek povede.`;

  return (
    <div className="flex flex-col gap-6">
      <section className="relative flex flex-wrap items-center gap-x-10 gap-y-5 overflow-hidden rounded-[22px] bg-pine-800 p-7 text-cream sm:gap-y-6 sm:rounded-[28px] sm:p-11">
        <Snow />
        <div className="relative flex min-w-0 flex-[999_1_420px] flex-col gap-3.5">
          <Eyebrow className="tracking-[0.14em] text-gold-light">Ahoj, {firstName(me.name)}</Eyebrow>
          <h1 className="font-heading text-[32px] leading-[1.1] font-semibold sm:text-[46px] sm:leading-[1.08]">
            {days === 0 ? (
              "Dnes je Štědrý den."
            ) : (
              <>
                Do Štědrého dne {days >= 2 && days <= 4 ? "zbývají" : "zbývá"}{" "}
                <span className="text-gold-light">{days}</span> {plural(days, "den", "dny", "dní")}.
              </>
            )}
          </h1>
          <p className="max-w-[560px] text-[17px] leading-relaxed text-cream/85">{heroText}</p>
          <div className="flex flex-wrap gap-2.5 pt-1.5 *:flex-auto sm:*:flex-none">
            <Button asChild>
              <Link href="/komu-davam">
                Komu dávám
                <ArrowRightIcon aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="onDark">
              <Link href="/prani">Moje přání</Link>
            </Button>
          </div>
        </div>
        <Ornament />
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6">
        <OverviewCard>
          <Eyebrow>Tvůj obdarovaný</Eyebrow>
          {giftee.state === "not-drawn" && (
            <div className="flex flex-1 flex-col gap-3.5">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted text-pine-700">
                <LockIcon aria-hidden="true" className="size-6.5" />
              </span>
              <h2 className="font-heading text-[26px] font-semibold">Losování ještě neproběhlo</h2>
              <p className="leading-relaxed text-muted-foreground">
                Jakmile správce skupinu rozlosuje, uvidíš tady, koho obdarováváš. Mezitím si sepiš vlastní přání.
              </p>
              {me.is_admin && (
                <div className="mt-auto">
                  <Button asChild variant="secondary">
                    <Link href="/sprava">Přejít k losování</Link>
                  </Button>
                </div>
              )}
            </div>
          )}
          {giftee.state === "sealed" && (
            <div className="flex flex-1 flex-col gap-4">
              <div aria-hidden="true" className="relative h-32 overflow-hidden rounded-[14px] border border-[#e0d2b6] bg-muted">
                <svg viewBox="0 0 300 128" preserveAspectRatio="none" className="absolute inset-0 size-full">
                  <path d="M0 0 L150 78 L300 0" fill="#E4D6BA" stroke="#D2C4A8" strokeWidth="1.5" />
                </svg>
                <span className="absolute top-[78px] left-1/2 flex size-13 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-[0_4px_10px_rgba(126,26,34,.35)]">
                  <StarMark className="size-6 text-gold-light" />
                </span>
              </div>
              <h2 className="font-heading text-[26px] font-semibold">Máš vylosováno</h2>
              <p className="leading-relaxed text-muted-foreground">Obálku otevři, až se nikdo nebude dívat přes rameno.</p>
              <div className="mt-auto">
                <RevealButton />
              </div>
            </div>
          )}
          {giftee.state === "opened" && (
            <div className="flex flex-1 flex-col gap-4">
              <div className="flex items-center gap-4">
                <PersonAvatar
                  name={giftee.giftee.name}
                  color={giftee.giftee.color}
                  className="size-16 shadow-[0_0_0_3px_#fffdf8,0_0_0_5px_var(--gold)]"
                  textClassName="text-[22px]"
                />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Obdarováváš</span>
                  <span className="font-heading text-[28px] leading-tight font-semibold">{giftee.giftee.name}</span>
                </div>
              </div>
              <p className="leading-relaxed text-muted-foreground">
                Na seznamu je {giftee.wishes.length} přání, koupeno{" "}
                {giftee.wishes.filter((w) => giftee.bought.includes(w.id)).length}. Zůstane to tajemství až do
                rozbalování.
              </p>
              <div className="mt-auto">
                <Button asChild>
                  <Link href="/komu-davam">Zobrazit přání</Link>
                </Button>
              </div>
            </div>
          )}
        </OverviewCard>

        <OverviewCard>
          <Eyebrow>Můj seznam přání</Eyebrow>
          <div className="flex items-baseline gap-2.5">
            <span className="font-heading text-[56px] leading-none font-semibold text-pine-700">{myWishes.length}</span>
            <span className="text-muted-foreground">přání na seznamu</span>
          </div>
          {myWishes.length > 0 ? (
            <>
              <ul className="flex flex-col gap-2.5">
                {myWishes.slice(0, 3).map((w) => (
                  <li key={w.id} className="flex items-center gap-2.5 font-semibold">
                    <GiftIcon aria-hidden="true" className="size-[18px] flex-none text-primary" />
                    <span className="truncate">{w.title}</span>
                  </li>
                ))}
              </ul>
              {myWishes.length > 3 && (
                <span className="text-sm text-muted-foreground">a další {myWishes.length - 3}</span>
              )}
            </>
          ) : (
            <p className="leading-relaxed text-muted-foreground">
              Zatím tu nic není. Pomoz svému Ježíškovi a napiš, co by tě potěšilo.
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <AddWishButton variant="secondary" />
            <Button asChild variant="ghost">
              <Link href="/prani">Celý seznam</Link>
            </Button>
          </div>
        </OverviewCard>

        <OverviewCard className="gap-[18px]">
          <Eyebrow>Naše nadílka</Eyebrow>
          <InfoRow icon={<WalletIcon />} label="Rozpočet na dárek">
            {settings.budget || "Zatím nestanoven"}
          </InfoRow>
          <InfoRow icon={<CalendarIcon />} label="Předávání dárků">
            {settings.handover || "Zatím nestanoveno"}
          </InfoRow>
          <InfoRow icon={<UsersIcon />} label={`Skupina · ${participantsText(members.length)}`}>
            <div className="flex pt-1.5 pl-2">
              {members.map((m) => (
                <PersonAvatar
                  key={m.id}
                  name={m.name}
                  color={m.color}
                  title={m.name}
                  className="-ml-2 size-[34px] ring-2 ring-card"
                  textClassName="text-xs"
                />
              ))}
            </div>
          </InfoRow>
          <div className="mt-auto flex">
            <Badge
              className={cn(
                "h-auto gap-2 px-3.5 py-2 text-sm font-bold",
                status.drawn ? "bg-pine-700 text-white" : "bg-[#f3e4c0] text-[#5c4512]",
              )}
            >
              <span className="size-2 rounded-full bg-current" />
              {status.drawn ? "Rozlosováno" : "Čeká na losování"}
            </Badge>
          </div>
        </OverviewCard>
      </div>
    </div>
  );
}

function OverviewCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <Card className={cn("gap-4 rounded-[22px] p-[22px] sm:p-7", className)}>
      {children}
    </Card>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3.5">
      <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-muted text-pine-700 [&_svg]:size-5">
        {icon}
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="font-bold">{children}</div>
      </div>
    </div>
  );
}

function Ornament() {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 220" className="relative hidden h-[198px] w-[180px] flex-none sm:block">
      <line x1="100" y1="0" x2="100" y2="44" stroke="#C9A14A" strokeWidth="2" />
      <rect x="84" y="40" width="32" height="20" rx="4" fill="#C9A14A" />
      <circle cx="100" cy="134" r="78" fill="#A8232E" />
      <path d="M26 118 Q100 96 174 118" stroke="#E2C578" strokeWidth="5" fill="none" />
      <path d="M24 146 Q100 168 176 146" stroke="#E2C578" strokeWidth="5" fill="none" />
      <g fill="#F7F1E5">
        <circle cx="60" cy="132" r="4" />
        <circle cx="100" cy="134" r="5" />
        <circle cx="140" cy="132" r="4" />
        <circle cx="80" cy="133" r="3" />
        <circle cx="120" cy="133" r="3" />
      </g>
      <ellipse cx="72" cy="96" rx="14" ry="22" fill="#fff" opacity=".18" transform="rotate(30 72 96)" />
    </svg>
  );
}
