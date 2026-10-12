"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, MotionConfig, motion, type Transition } from "motion/react";

// Jen průhlednost a posun/měřítko – plynulé i na slabších telefonech.
const EASE: Transition["ease"] = [0.2, 0.8, 0.2, 1];
const REVEAL_FLAG = "tj-just-revealed";

/** Respektuje systémové „omezit pohyb“. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Obsah stránky jemně vyjede při příchodu. Po obnovení dat se neopakuje. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Seznam s animovaným přidáváním a odebíráním položek (první vykreslení bez animace). */
export function AnimatedList({
  as = "div",
  className,
  children,
}: {
  as?: "div" | "ul";
  className?: string;
  children: React.ReactNode;
}) {
  const Tag = as;
  return (
    <Tag className={className}>
      <AnimatePresence initial={false}>
        {children}
      </AnimatePresence>
    </Tag>
  );
}

/** Položka seznamu – příchod, odchod a plynulý přesun na nové místo. */
export function ItemTransition({
  as = "div",
  className,
  children,
}: {
  as?: "div" | "li";
  className?: string;
  children: React.ReactNode;
}) {
  const Component = as === "li" ? motion.li : motion.div;
  return (
    <Component
      layout
      className={className}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.28, ease: EASE, layout: { duration: 0.35, ease: EASE } }}
    >
      {children}
    </Component>
  );
}

/** Označí, že uživatel právě otevřel obálku – další vykreslení obsah odhalí. */
export function markJustRevealed() {
  try {
    sessionStorage.setItem(REVEAL_FLAG, "1");
  } catch {}
}

/** Obsah otevřené obálky. Animuje se jen hned po otevření, ne při každé návštěvě. */
export function RevealTransition({ children }: { children: React.ReactNode }) {
  const [reveal] = useState(() => {
    try {
      return typeof window !== "undefined" && sessionStorage.getItem(REVEAL_FLAG) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => {
      try {
        sessionStorage.removeItem(REVEAL_FLAG);
      } catch {}
    }, 1000);
    return () => clearTimeout(t);
  }, [reveal]);

  return (
    <motion.div
      initial={reveal ? { opacity: 0, scale: 0.95, y: 12 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/** Prolnutí dvou stavů na stejném místě (podle swapKey). */
export function SwapTransition({ swapKey, children }: { swapKey: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={swapKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
