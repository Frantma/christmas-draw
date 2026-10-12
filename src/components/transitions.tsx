import { ViewTransition } from "react";

const NAV = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

/** Obsah stránky – při navigaci se posune podle směru v menu. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={NAV} exit={NAV} default="none">
      {children}
    </ViewTransition>
  );
}

/** Položka seznamu – plynulý příchod, odchod a přesun na nové místo. */
export function ItemTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="item-enter" exit="item-exit" update="item-move" default="none">
      {children}
    </ViewTransition>
  );
}

/** Zapečetěná obálka odchází při otevření. */
export function SealedTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition exit={{ reveal: "seal-out", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}

/** Obsah otevřené obálky se odhalí. */
export function RevealTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter={{ reveal: "reveal", default: "none" }} default="none">
      {children}
    </ViewTransition>
  );
}

/** Prolnutí dvou stavů na stejném místě. */
export function SwapTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="swap" exit="swap" default="none">
      {children}
    </ViewTransition>
  );
}
