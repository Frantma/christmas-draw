/* eslint-disable @next/next/no-img-element -- obrázky jsou z libovolných domén */
import { CheckIcon, ExternalLinkIcon, GiftIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { domain } from "@/lib/format";
import type { Wish } from "@/lib/types";
import { cn } from "@/lib/utils";

const PLACEHOLDERS = [
  "bg-pine-700 text-gold-light",
  "bg-primary text-cream",
  "bg-[#2f5d7c] text-cream",
  "bg-gold text-pine-900",
];

export function WishPlaceholder({ index, className }: { index: number; className?: string }) {
  return (
    <div className={cn("dotted flex items-center justify-center", PLACEHOLDERS[index % 4], className)}>
      <GiftIcon aria-hidden="true" className="size-13" strokeWidth={1.6} />
    </div>
  );
}

export function WishCard({
  wish,
  index,
  bought = false,
  linkLabel,
  actions,
}: {
  wish: Wish;
  index: number;
  bought?: boolean;
  linkLabel?: string;
  actions: React.ReactNode;
}) {
  return (
    <Card
      className={cn(
        "gap-0 rounded-[22px] py-0 transition-[opacity,translate,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_14px_30px_rgba(14,42,32,.12)]",
        bought && "opacity-60",
      )}
    >
      <div className="relative h-44 flex-none">
        {wish.image_url ? (
          <img src={wish.image_url} alt={wish.title} className="size-full object-cover" />
        ) : (
          <WishPlaceholder index={index} className="size-full" />
        )}
        {bought && (
          <span className="pop absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1.5 text-[13px] font-bold text-pine-700">
            <CheckIcon aria-hidden="true" className="size-3.5" strokeWidth={3} />
            Koupeno
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5">
        <h3 className="font-heading text-[22px] leading-tight font-semibold">{wish.title}</h3>
        {wish.description && (
          <p className="line-clamp-3 text-[15px] leading-normal whitespace-pre-line text-muted-foreground">
            {wish.description}
          </p>
        )}
        {wish.link && (
          <a
            href={wish.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start text-sm font-bold text-primary hover:text-primary/80"
          >
            <ExternalLinkIcon aria-hidden="true" className="size-4" />
            {linkLabel ? `${linkLabel} · ` : ""}
            {domain(wish.link)}
          </a>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5 border-t border-[#eee5d3] pt-2.5">{actions}</div>
      </div>
    </Card>
  );
}
