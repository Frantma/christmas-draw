"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Popis přání zkrácený na 3 řádky; když se nevejde, jde rozbalit celý. */
export function WishDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || expanded) return;
    const measure = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, expanded]);

  return (
    <div className="flex flex-col items-start gap-1">
      <p
        ref={ref}
        id={id}
        className={cn(
          "text-[15px] leading-normal whitespace-pre-line text-muted-foreground",
          !expanded && "line-clamp-3",
        )}
      >
        {text}
      </p>
      {(overflows || expanded) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
          className="-mx-1 inline-flex min-h-8 items-center gap-1 rounded-md px-1 text-sm font-bold text-pine-700 outline-none hover:text-pine-900 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {expanded ? "Skrýt" : "Zobrazit celý popis"}
          <ChevronDownIcon
            aria-hidden="true"
            className={cn("size-4 transition-transform duration-200", expanded && "rotate-180")}
          />
        </button>
      )}
    </div>
  );
}
