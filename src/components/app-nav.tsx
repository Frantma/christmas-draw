"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { navTypes } from "@/lib/nav";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Přehled" },
  { href: "/prani", label: "Moje přání" },
  { href: "/komu-davam", label: "Komu dávám" },
];

export function AppNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...ITEMS, { href: "/sprava", label: "Správa skupiny" }] : ITEMS;

  return (
    <nav
      aria-label="Hlavní navigace"
      className="order-3 flex min-w-0 flex-auto basis-full gap-1 overflow-x-auto pb-1 [scrollbar-width:none] sm:basis-auto sm:pb-0"
    >
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Button
            key={item.href}
            asChild
            variant="ghost"
            className={cn(
              "h-[42px] px-3.5 text-sm text-cream/80 hover:bg-cream/10 hover:text-white sm:h-11 sm:px-4 sm:text-[15px]",
              active && "bg-cream text-pine-900 hover:bg-cream hover:text-pine-900",
            )}
          >
            <Link
              href={item.href}
              transitionTypes={navTypes(pathname, item.href)}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          </Button>
        );
      })}
    </nav>
  );
}
