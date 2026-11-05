"use client";

import Link from "next/link";
import { MessageCircleIcon } from "lucide-react";
import { useChats } from "@/components/chat-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/** Na přehledu – ukáže se jen, když čekají nepřečtené zprávy. */
export function UnreadMessagesButton() {
  const { unreadTotal } = useChats();
  if (!unreadTotal) return null;
  return (
    <Button asChild variant="onDark">
      <Link href="/zpravy">
        <MessageCircleIcon aria-hidden="true" />
        Nové zprávy
        <Badge className="h-5 min-w-5 bg-primary px-1.5 text-[11px] font-bold text-white">{unreadTotal}</Badge>
      </Link>
    </Button>
  );
}
