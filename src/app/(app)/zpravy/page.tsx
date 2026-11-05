import { ChatView } from "@/components/chat-view";
import { PageHead } from "@/components/page-head";
import { PageTransition } from "@/components/transitions";
import { getChatMessages, getChats } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { ChatKind } from "@/lib/types";

export const metadata = { title: "Zprávy · Tajný Ježíšek" };

export default async function MessagesPage({ searchParams }: PageProps<"/zpravy">) {
  const { prani, s } = await searchParams;
  const chats = await getChats();
  const giftee = chats.find((c) => c.kind === "giftee");
  const santa = chats.find((c) => c.kind === "santa");

  const [gifteeMessages, santaMessages] = await Promise.all([
    giftee?.can_write ? getChatMessages("giftee") : [],
    santa ? getChatMessages("santa") : [],
  ]);

  // „Zeptat se na tohle přání“ – název přání (RLS vrátí jen přání mého obdarovaného)
  let wish: { id: string; title: string } | null = null;
  if (typeof prani === "string" && giftee?.can_write) {
    const supabase = await createClient();
    const { data } = await supabase.from("wishes").select("id, title").eq("id", prani).maybeSingle();
    if (data) wish = data;
  }

  let initialKind: ChatKind = "giftee";
  if (s === "jezisek") initialKind = "santa";
  else if (!wish && s !== "obdarovany" && (santa?.unread ?? 0) > (giftee?.unread ?? 0)) initialKind = "santa";

  return (
    <PageTransition>
      <div className="flex flex-col gap-7">
        <PageHead eyebrow="Anonymní zprávy" title="Zprávy">
          Doptej se svého obdarovaného na detaily, nebo odpověz svému Ježíškovi. Kdo komu dává, zůstane tajemstvím.
        </PageHead>
        <ChatView
          initialMessages={{ giftee: gifteeMessages, santa: santaMessages }}
          initialKind={initialKind}
          wish={wish}
        />
      </div>
    </PageTransition>
  );
}
