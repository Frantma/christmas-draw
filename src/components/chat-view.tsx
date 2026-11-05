"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { GiftIcon, LockIcon, SendHorizonalIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { StarMark } from "@/components/brand";
import { useChats } from "@/components/chat-provider";
import { PersonAvatar } from "@/components/person-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { firstName } from "@/lib/format";
import type { ChatInfo, ChatKind, ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

const SEND_ERRORS: Record<string, string> = {
  ENVELOPE_SEALED: "Nejdřív si otevři obálku.",
  EMPTY_MESSAGE: "Napiš nějaký text.",
  MESSAGE_TOO_LONG: "Zpráva může mít nejvýš 2000 znaků.",
  INVALID_WISH: "Tohle přání už neexistuje.",
  RATE_LIMIT: "Píšeš moc rychle, chvilku počkej.",
  NO_CHAT: "Tahle konverzace už neexistuje – losování se nejspíš změnilo.",
};

function sendError(message: string) {
  const code = Object.keys(SEND_ERRORS).find((c) => message.includes(c));
  return code ? SEND_ERRORS[code] : "Zprávu se nepodařilo odeslat, zkus to znovu.";
}

const timeFormat = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Prague",
});

export function ChatView({
  initialMessages,
  initialKind,
  wish,
}: {
  initialMessages: Record<ChatKind, ChatMessage[]>;
  initialKind: ChatKind;
  wish: { id: string; title: string } | null;
}) {
  const { chats } = useChats();
  const [kind, setKind] = useState<ChatKind>(initialKind);
  const giftee = chats.find((c) => c.kind === "giftee");
  const santa = chats.find((c) => c.kind === "santa");

  if (!giftee && !santa) {
    return (
      <Card className="items-center gap-3.5 rounded-[22px] px-6 py-16 text-center">
        <span className="flex size-21 items-center justify-center rounded-full bg-muted text-pine-700">
          <LockIcon aria-hidden="true" className="size-9" />
        </span>
        <h2 className="font-heading text-[28px] font-semibold">Zprávy se otevřou po losování</h2>
        <p className="max-w-[460px] leading-relaxed text-muted-foreground">
          Pak tu budeš moct anonymně psát svému obdarovanému a odpovídat svému Ježíškovi.
        </p>
      </Card>
    );
  }

  return (
    <Tabs value={kind} onValueChange={(v) => setKind(v as ChatKind)} className="gap-5">
      <TabsList className="h-11! w-full rounded-full bg-muted p-1 sm:w-fit">
        <TabsTrigger value="giftee" className="gap-2 rounded-full px-4 text-sm font-semibold">
          {giftee?.title ? `Píšu: ${firstName(giftee.title)}` : "Můj obdarovaný"}
          <UnreadBadge count={giftee?.unread ?? 0} />
        </TabsTrigger>
        <TabsTrigger value="santa" className="gap-2 rounded-full px-4 text-sm font-semibold">
          Můj Ježíšek
          <UnreadBadge count={santa?.unread ?? 0} />
        </TabsTrigger>
      </TabsList>

      <TabsContent value="giftee">
        {giftee && (
          <Conversation chat={giftee} initial={initialMessages.giftee} active={kind === "giftee"} wish={wish} />
        )}
      </TabsContent>
      <TabsContent value="santa">
        {santa && <Conversation chat={santa} initial={initialMessages.santa} active={kind === "santa"} wish={null} />}
      </TabsContent>
    </Tabs>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (!count) return null;
  return (
    <Badge
      className="h-5 min-w-5 bg-primary px-1.5 text-[11px] font-bold text-white"
      aria-label={`${count} nepřečtených`}
    >
      {count}
    </Badge>
  );
}

function Conversation({
  chat,
  initial,
  active,
  wish: initialWish,
}: {
  chat: ChatInfo;
  initial: ChatMessage[];
  active: boolean;
  wish: { id: string; title: string } | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const { refresh, onNewMessage } = useChats();
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [wish, setWish] = useState(initialWish);
  const [sending, startSending] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);
  const isSanta = chat.kind === "santa";

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("chat_messages", { p_kind: chat.kind });
    if (error || !data) return;
    setMessages(data as ChatMessage[]);
    if (active && document.visibilityState === "visible") {
      await supabase.rpc("mark_chat_read", { p_kind: chat.kind });
      void refresh();
    }
  }, [supabase, chat.kind, active, refresh]);

  // Při otevření konverzace označit přečtené a načíst čerstvá data
  useEffect(() => {
    if (!active || !chat.can_write) return;
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [active, chat.can_write, load]);

  // Realtime signál + pojistka (návrat do okna, každých 30 s)
  useEffect(() => {
    if (!chat.can_write) return;
    const off = onNewMessage((k) => {
      if (k === chat.kind) void load();
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && active) void load();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && active) void load();
    }, POLL_MS);
    return () => {
      off();
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [chat.can_write, chat.kind, active, load, onNewMessage]);

  // Vždy zobrazit nejnovější zprávu
  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, active]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    startSending(async () => {
      const { error } = await supabase.rpc("send_message", {
        p_kind: chat.kind,
        p_body: body,
        p_wish_id: wish?.id ?? null,
      });
      if (error) {
        toast.error(sendError(error.message));
        return;
      }
      setText("");
      setWish(null);
      await load();
    });
  }

  if (!chat.can_write) {
    return (
      <Card className="items-center gap-3.5 rounded-[22px] px-6 py-14 text-center">
        <span className="flex size-18 items-center justify-center rounded-full bg-muted text-pine-700">
          <LockIcon aria-hidden="true" className="size-8" />
        </span>
        <h2 className="font-heading text-[26px] font-semibold">Nejdřív otevři obálku</h2>
        <p className="max-w-[440px] leading-relaxed text-muted-foreground">
          Psát svému obdarovanému můžeš, až budeš vědět, kdo to je.
        </p>
        <Button asChild>
          <Link href="/komu-davam">Otevřít obálku</Link>
        </Button>
      </Card>
    );
  }

  return (
    <Card className="gap-0 overflow-hidden rounded-[22px] py-0">
      {/* Hlavička konverzace */}
      <div className="flex items-center gap-3.5 border-b bg-pine-800 px-5 py-4 text-cream">
        {isSanta ? (
          <span className="flex size-11 flex-none items-center justify-center rounded-full bg-primary">
            <StarMark className="size-6 text-gold-light" />
          </span>
        ) : (
          <PersonAvatar
            name={chat.title ?? "?"}
            color={chat.color ?? "#1F4D3A"}
            className="size-11 outline-2 outline-offset-2 outline-gold"
            textClassName="text-sm"
          />
        )}
        <div className="flex min-w-0 flex-col">
          <span className="font-heading text-xl font-semibold">{isSanta ? "Tvůj Ježíšek" : chat.title}</span>
          <span className="text-[13px] text-cream/75">
            {isSanta
              ? "Kdo to je, se dozvíš až při rozbalování."
              : `Píšeš jako Tajný Ježíšek – ${firstName(chat.title ?? "")} neuvidí, kdo jsi.`}
          </span>
        </div>
      </div>

      {/* Zprávy */}
      <ol
        ref={listRef}
        aria-label="Zprávy"
        aria-live="polite"
        className="flex h-[min(58dvh,520px)] flex-col gap-2.5 overflow-y-auto bg-background/60 px-4 py-5 sm:px-6"
      >
        {messages.length === 0 && (
          <li className="m-auto max-w-[360px] text-center text-sm leading-relaxed text-muted-foreground">
            {isSanta
              ? "Tvůj Ježíšek ti zatím nenapsal. Můžeš mu napsat první – třeba upřesnit velikost nebo barvu."
              : "Zatím tu nic není. Zeptej se na cokoli, co ti pomůže vybrat dárek."}
          </li>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "flex max-w-[85%] flex-col gap-1 sm:max-w-[70%]",
                m.mine ? "self-end items-end" : "self-start",
              )}
            >
              {m.wish_title && (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-text">
                  <GiftIcon aria-hidden="true" className="size-3.5" />K přání: {m.wish_title}
                </span>
              )}
              <div
                className={cn(
                  "rounded-2xl px-4 py-2.5 text-[15px] leading-normal break-words whitespace-pre-wrap",
                  m.mine ? "rounded-br-md bg-pine-700 text-white" : "rounded-bl-md bg-card ring-1 ring-foreground/10",
                )}
              >
                <span className="sr-only">{m.mine ? "Ty: " : isSanta ? "Ježíšek: " : `${chat.title}: `}</span>
                {m.body}
              </div>
              <time dateTime={m.created_at} className="px-1 text-[11px] text-muted-foreground">
                {timeFormat.format(new Date(m.created_at))}
              </time>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>

      {/* Psaní */}
      <form onSubmit={send} className="flex flex-col gap-2 border-t bg-card px-4 py-3 sm:px-6">
        {wish && (
          <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-muted py-1 pr-1 pl-3 text-xs font-semibold text-gold-text">
            <GiftIcon aria-hidden="true" className="size-3.5" />K přání: {wish.title}
            <button
              type="button"
              onClick={() => setWish(null)}
              aria-label="Zrušit odkaz na přání"
              className="flex size-6 items-center justify-center rounded-full hover:bg-foreground/10"
            >
              <XIcon aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor={`msg-${chat.kind}`} className="sr-only">
            Zpráva
          </label>
          <Textarea
            id={`msg-${chat.kind}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                window.matchMedia("(hover: hover)").matches
              ) {
                e.preventDefault();
                send();
              }
            }}
            maxLength={2000}
            rows={1}
            placeholder={isSanta ? "Napiš svému Ježíškovi…" : `Napiš ${firstName(chat.title ?? "")}…`}
            autoFocus={!!wish}
            className="max-h-40 min-h-11 resize-none py-2.5"
          />
          <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Odeslat zprávu">
            {sending ? <Spinner /> : <SendHorizonalIcon aria-hidden="true" />}
          </Button>
        </div>
        {!isSanta && (
          <span className="text-xs text-muted-foreground">Nepodepisuj se a nepiš nic, podle čeho by tě poznali.</span>
        )}
      </form>
    </Card>
  );
}
