import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DrawStatus, Member, Settings, Wish } from "@/lib/types";

/** Přihlášený účastník. Bez účtu nebo mimo skupinu přesměruje na přihlášení. */
export const getMe = cache(async () => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/prihlaseni");

  const { data: me } = await supabase
    .from("participants")
    .select("id, name, email, color, is_admin")
    .eq("user_id", userId)
    .maybeSingle();
  if (!me) redirect("/prihlaseni?chyba=mimo-skupinu");

  return { ...(me as Omit<Member, "wish_count">), userId };
});

export const getMembers = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("group_members");
  if (error) throw error;
  return (data ?? []) as Member[];
});

export const getSettings = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("settings").select("budget, handover").single();
  if (error) throw error;
  return data as Settings;
});

export const getDrawStatus = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("draw_status").single();
  if (error) throw error;
  return data as DrawStatus;
});

export const getMyWishes = cache(async () => {
  const me = await getMe();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wishes")
    .select("id, owner_id, title, description, link, image_url, image_path")
    .eq("owner_id", me.id)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Wish[];
});

export type GifteeState =
  | { state: "not-drawn" }
  | { state: "sealed" }
  | { state: "opened"; giftee: Member; wishes: Wish[]; bought: string[] };

/** Stav mé obálky. Přání obdarovaného vrátí databáze až po otevření obálky. */
export const getGiftee = cache(async (): Promise<GifteeState> => {
  const me = await getMe();
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("receiver_id, revealed_at")
    .eq("giver_id", me.id)
    .maybeSingle();

  if (!assignment) return { state: "not-drawn" };
  if (!assignment.revealed_at) return { state: "sealed" };

  const members = await getMembers();
  const giftee = members.find((m) => m.id === assignment.receiver_id);
  if (!giftee) return { state: "not-drawn" };

  const [{ data: wishes }, { data: purchases }] = await Promise.all([
    supabase
      .from("wishes")
      .select("id, owner_id, title, description, link, image_url, image_path")
      .eq("owner_id", giftee.id)
      .order("created_at"),
    supabase.from("purchases").select("wish_id"),
  ]);

  return {
    state: "opened",
    giftee,
    wishes: (wishes ?? []) as Wish[],
    bought: (purchases ?? []).map((p) => p.wish_id as string),
  };
});
