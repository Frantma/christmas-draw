"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { revealEnvelope } from "@/app/actions";
import { StarMark } from "@/components/brand";
import { markJustRevealed } from "@/components/transitions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const ANIMATION_MS = 950;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function useReveal() {
  const [opening, setOpening] = useState(false);
  const [pending, startTransition] = useTransition();

  function open() {
    setOpening(true);
    startTransition(async () => {
      markJustRevealed();
      // Animace dohraje, i když server odpoví dřív.
      const [result] = await Promise.all([revealEnvelope(), wait(ANIMATION_MS)]);
      if (result.error) {
        toast.error(result.error);
        setOpening(false);
      }
    });
  }

  return { opening, busy: opening || pending, open };
}

/** Zapečetěná obálka na kartě v přehledu. */
export function EnvelopeCard({ children }: { children: React.ReactNode }) {
  const { opening, busy, open } = useReveal();

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div aria-hidden="true" className="relative h-32 overflow-hidden rounded-[14px] border border-[#e0d2b6] bg-muted">
        {opening && (
          <div className="letter-rise absolute inset-x-8 bottom-0 flex h-full flex-col gap-2 rounded-t-lg bg-card px-5 pt-5 shadow-md">
            <span className="h-2 w-2/3 rounded-full bg-muted" />
            <span className="h-2 w-1/2 rounded-full bg-muted" />
            <span className="h-2 w-3/5 rounded-full bg-muted" />
          </div>
        )}
        <svg
          viewBox="0 0 300 128"
          preserveAspectRatio="none"
          className={cn("absolute inset-0 z-10 size-full", opening && "flap-open")}
        >
          <path d="M0 0 L150 78 L300 0" fill="#E4D6BA" stroke="#D2C4A8" strokeWidth="1.5" />
        </svg>
        <span
          className={cn(
            "absolute top-[78px] left-1/2 z-20 flex size-13 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary shadow-[0_4px_10px_rgba(126,26,34,.35)]",
            opening && "seal-break",
          )}
        >
          <StarMark className="size-6 text-gold-light" />
        </span>
      </div>
      {children}
      <div className="mt-auto">
        <Button type="button" onClick={open} disabled={busy}>
          {busy && <Spinner />}
          Otevřít obálku
        </Button>
      </div>
    </div>
  );
}

/** Velká zapečetěná obálka na stránce „Komu dávám“. */
export function EnvelopeHero({ children }: { children: React.ReactNode }) {
  const { opening, busy, open } = useReveal();

  return (
    <div className="flex flex-col items-center gap-[18px] rounded-[28px] bg-pine-800 px-6 py-16 text-center text-cream">
      <span
        className={cn(
          "flex size-22 items-center justify-center rounded-full bg-primary",
          opening ? "seal-break" : "breathe",
        )}
      >
        <StarMark className="size-10 text-gold-light" />
      </span>
      {children}
      <Button type="button" size="lg" onClick={open} disabled={busy}>
        {busy && <Spinner />}
        Otevřít obálku
      </Button>
    </div>
  );
}
