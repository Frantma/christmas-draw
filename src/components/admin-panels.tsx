"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckIcon, PlusIcon, ShuffleIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { addParticipant, cancelDraw, removeParticipant, runDraw, updateSettings } from "@/app/actions";
import { PersonAvatar } from "@/components/person-avatar";
import { ItemTransition, SwapTransition } from "@/components/transitions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { firstName, participantsText, plural } from "@/lib/format";
import type { DrawStatus, Member, Settings } from "@/lib/types";

// ---------------------------------------------------------------------------
// Účastníci
// ---------------------------------------------------------------------------

export function ParticipantsPanel({ members, drawn }: { members: Member[]; drawn: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [adding, startAdding] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, " ");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanName || !cleanEmail) return setError("Vyplň jméno i e-mail.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return setError("E-mail nemá správný tvar.");
    startAdding(async () => {
      const result = await addParticipant(cleanName, cleanEmail);
      if (result.error) return setError(result.error);
      setName("");
      setEmail("");
      toast.success(`${firstName(cleanName)} je ve skupině`);
    });
  }

  return (
    <Card className="min-w-0 flex-[999_1_540px] gap-[18px] rounded-[22px] p-[22px] sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-[26px] font-semibold">Účastníci</h2>
        <Badge variant="secondary" className="h-auto bg-muted px-3 py-1.5 text-sm font-bold text-foreground">
          {participantsText(members.length)}
        </Badge>
      </div>

      <ul className="flex flex-col">
        {members.map((m) => (
          <ItemTransition key={m.id}>
            <li className="flex items-center gap-3.5 border-t border-[#eee5d3] py-3">
              <PersonAvatar name={m.name} color={m.color} className="size-[42px]" textClassName="text-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex flex-wrap items-center gap-2 font-bold">
                  {m.name}
                  {m.is_admin && <Badge className="bg-pine-700 font-bold text-white">Správce</Badge>}
                </span>
                <span className="truncate text-sm text-muted-foreground">{m.email}</span>
              </div>
              <span className="hidden text-sm whitespace-nowrap text-muted-foreground min-[421px]:inline">
                {m.wish_count} přání
              </span>
              {!drawn && !m.is_admin ? <RemoveParticipant member={m} /> : <span className="w-11 flex-none" />}
            </li>
          </ItemTransition>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl bg-accent p-5">
        <span className="text-base font-bold">Přidat účastníka</span>
        <div className="flex flex-wrap items-end gap-3">
          <Field className="flex-[1_1_200px]" data-disabled={drawn}>
            <FieldLabel htmlFor="new-name">Jméno a příjmení</FieldLabel>
            <Input
              id="new-name"
              placeholder="např. Karel Novák"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError("");
              }}
              disabled={drawn}
            />
          </Field>
          <Field className="flex-[1_1_220px]" data-disabled={drawn}>
            <FieldLabel htmlFor="new-email">E-mail</FieldLabel>
            <Input
              id="new-email"
              type="email"
              placeholder="karel@example.cz"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              disabled={drawn}
            />
          </Field>
          <Button type="submit" variant="secondary" className="h-12" disabled={drawn || adding}>
            {adding ? <Spinner /> : <PlusIcon aria-hidden="true" />}
            Přidat
          </Button>
        </div>
        {error && <FieldError className="font-semibold">{error}</FieldError>}
        <FieldDescription>
          {drawn
            ? "Po losování nejde skupinu měnit. Pro úpravy nejdřív losování zruš."
            : "Nový účastník se zaregistruje se svým e-mailem a nastaví si heslo. Jiné e-maily se zaregistrovat nemůžou."}
        </FieldDescription>
      </form>
    </Card>
  );
}

function RemoveParticipant({ member }: { member: Member }) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="bg-transparent"
          aria-label={`Odebrat ${member.name}`}
          disabled={pending}
        >
          {pending ? <Spinner /> : <Trash2Icon aria-hidden="true" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Odebrat {member.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Smažou se i jeho/její přání ({member.wish_count}). Účastníka můžeš později přidat znovu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Nechat</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              startTransition(async () => {
                const result = await removeParticipant(member.id);
                if (result.error) toast.error(result.error);
                else toast.success(`${firstName(member.name)} odebrán(a) ze skupiny`);
              })
            }
          >
            Odebrat
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Losování
// ---------------------------------------------------------------------------

export function DrawPanel({ status }: { status: DrawStatus }) {
  const [pending, startTransition] = useTransition();
  const n = status.total;

  function run(action: typeof runDraw, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.error) toast.error(result.error);
      else toast.success(success);
    });
  }

  return (
    <section className="relative flex flex-col gap-4 overflow-hidden rounded-[22px] bg-pine-800 p-[22px] text-cream sm:p-7">
      <div className="flex items-center gap-3">
        <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-cream/10 text-gold-light">
          <ShuffleIcon aria-hidden="true" className="size-[22px]" />
        </span>
        <h2 className="font-heading text-[26px] font-semibold">Losování</h2>
      </div>
      <p className="leading-relaxed text-cream/85">
        Každý dostane právě jednoho člověka a nikdo si nevylosuje sám sebe. Kdo má koho, neuvidí ani správce.
      </p>

      {!status.drawn ? (
        <SwapTransition>
          <div className="flex flex-col gap-2.5">
            <Button
              size="lg"
              disabled={n < 3 || pending}
              onClick={() => run(runDraw, "Rozlosováno. Každý teď najde jméno ve své obálce.")}
            >
              {pending ? <Spinner /> : <ShuffleIcon aria-hidden="true" />}
              Rozlosovat {participantsText(n)}
            </Button>
            {n < 3 && <span className="text-sm text-gold-light">K losování jsou potřeba aspoň 3 účastníci.</span>}
          </div>
        </SwapTransition>
      ) : (
        <SwapTransition>
          <div className="flex flex-col gap-3.5">
            <Badge className="h-auto gap-2 self-start bg-gold-light px-3.5 py-2 text-sm font-bold text-pine-900">
              <CheckIcon aria-hidden="true" strokeWidth={3} />
              Rozlosováno · {n} {plural(n, "dvojice", "dvojice", "dvojic")}
            </Badge>
            <span className="text-sm text-cream/80">
              Obálku si zatím otevřelo {status.opened} z {n}.
            </span>
            <div className="flex flex-wrap gap-2">
              <ConfirmButton
                variant="outline"
                className="border-[#d9ccb3] bg-white text-foreground"
                disabled={pending}
                label="Losovat znovu"
                title="Losovat znovu?"
                description="Všem se vylosuje nový člověk a otevřené obálky i značky „koupeno“ se vynulují."
                onConfirm={() => run(runDraw, "Rozlosováno znovu.")}
              />
              <ConfirmButton
                variant="onDark"
                disabled={pending}
                label="Zrušit losování"
                title="Zrušit losování?"
                description="Dvojice se smažou a skupinu půjde znovu upravovat. Přání zůstanou."
                onConfirm={() => run(cancelDraw, "Losování zrušeno")}
              />
            </div>
          </div>
        </SwapTransition>
      )}
    </section>
  );
}

function ConfirmButton({
  label,
  title,
  description,
  onConfirm,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "title"> & {
  label: string;
  title: string;
  description: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" {...props}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Zpět</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{label}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ---------------------------------------------------------------------------
// Pravidla nadílky (ukládá se průběžně)
// ---------------------------------------------------------------------------

export function SettingsPanel({ settings }: { settings: Settings }) {
  const [budget, setBudget] = useState(settings.budget);
  const [handover, setHandover] = useState(settings.handover);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setState("saving");
      const result = await updateSettings(budget, handover);
      if (result.error) {
        toast.error(result.error);
        setState("idle");
      } else {
        setState("saved");
      }
    }, 700);
    return () => clearTimeout(timer.current);
  }, [budget, handover]);

  return (
    <Card className="gap-4 rounded-[22px] p-[22px] sm:p-7">
      <h2 className="font-heading text-[26px] font-semibold">Pravidla nadílky</h2>
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="budget">Rozpočet na dárek</FieldLabel>
          <Input
            id="budget"
            placeholder="např. do 800 Kč"
            maxLength={120}
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="handover">Kdy a kde se předává</FieldLabel>
          <Input
            id="handover"
            placeholder="např. 20. 12., u babičky"
            maxLength={200}
            value={handover}
            onChange={(e) => setHandover(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <span className="flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
        {state === "saving" && <Spinner />}
        {state === "saving"
          ? "Ukládám…"
          : state === "saved"
            ? "Uloženo. Všichni to uvidí na přehledu."
            : "Změny se ukládají hned a uvidí je všichni na přehledu."}
      </span>
    </Card>
  );
}
