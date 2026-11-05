"use client";

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ChatInfo, ChatKind } from "@/lib/types";

type Listener = (kind: ChatKind) => void;

type ChatContextValue = {
  chats: ChatInfo[];
  unreadTotal: number;
  refresh: () => Promise<void>;
  /** Zavolá se při signálu „nová zpráva“ v dané konverzaci. */
  onNewMessage: (listener: Listener) => () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChats() {
  const ctx = use(ChatContext);
  if (!ctx) throw new Error("useChats musí být uvnitř ChatProvider");
  return ctx;
}

const FALLBACK_REFRESH_MS = 60_000;

/**
 * Drží seznam konverzací, počty nepřečtených a realtime odběr.
 * Realtime kanál nese jen prázdný signál – data se vždy načtou přes RPC,
 * které o dárci nic nevrací.
 */
export function ChatProvider({ initialChats, children }: { initialChats: ChatInfo[]; children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [chats, setChats] = useState(initialChats);
  const listeners = useRef(new Set<Listener>());
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("my_chats");
    if (!error && data) setChats(data as ChatInfo[]);
  }, [supabase]);

  const onNewMessage = useCallback((listener: Listener) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // Realtime: kanál chat:<thread_id> pro každou konverzaci, kterou smím poslouchat
  const subscribable = chats.filter((c) => c.can_write);
  const channelKey = subscribable.map((c) => `${c.kind}:${c.thread_id}`).join("|");

  useEffect(() => {
    if (!channelKey) return;
    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    (async () => {
      await supabase.realtime.setAuth();
      if (cancelled) return;
      for (const entry of channelKey.split("|")) {
        const [kind, threadId] = entry.split(":") as [ChatKind, string];
        const channel = supabase
          .channel(`chat:${threadId}`, { config: { private: true } })
          .on("broadcast", { event: "new_message" }, () => {
            void refresh();
            listeners.current.forEach((listener) => listener(kind));
          })
          .subscribe();
        channels.push(channel);
      }
    })();

    return () => {
      cancelled = true;
      channels.forEach((channel) => void supabase.removeChannel(channel));
    };
  }, [channelKey, supabase, refresh]);

  // Pojistka, kdyby se realtime signál ztratil: při návratu do okna, při navigaci a jednou za minutu
  useEffect(() => {
    const t = setTimeout(() => void refresh(), 0);
    return () => clearTimeout(t);
  }, [pathname, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, FALLBACK_REFRESH_MS);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [refresh]);

  const unreadTotal = chats.reduce((sum, c) => sum + c.unread, 0);

  return <ChatContext value={{ chats, unreadTotal, refresh, onNewMessage }}>{children}</ChatContext>;
}
