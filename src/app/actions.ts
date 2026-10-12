"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getMe } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { WISH_IMAGES_BUCKET } from "@/lib/supabase/env";

export type ActionResult = { error?: string };

const DB_ERRORS: Record<string, string> = {
  FORBIDDEN: "Tohle smí jen správce skupiny.",
  GROUP_LOCKED: "Po losování nejde skupinu měnit. Pro úpravy nejdřív losování zruš.",
  MISSING_FIELDS: "Vyplň jméno i e-mail.",
  INVALID_EMAIL: "E-mail nemá správný tvar.",
  EMAIL_TAKEN: "Tenhle e-mail už ve skupině je.",
  NOT_ENOUGH_PARTICIPANTS: "K losování jsou potřeba aspoň 3 účastníci.",
};

function dbError(error: { message: string } | null): ActionResult {
  if (!error) return {};
  const known = Object.keys(DB_ERRORS).find((code) => error.message.includes(code));
  return { error: known ? DB_ERRORS[known] : "Něco se pokazilo, zkus to prosím znovu." };
}

function refresh() {
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Přání
// ---------------------------------------------------------------------------

export type WishInput = {
  id: string | null;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  imagePath: string | null;
};

export async function saveWish(input: WishInput): Promise<ActionResult> {
  const me = await getMe();
  const supabase = await createClient();

  const title = input.title.trim();
  if (!title) return { error: "Vyplň prosím název dárku." };
  if (title.length > 80) return { error: "Název může mít nejvýš 80 znaků." };

  let link = input.link.trim();
  if (link && !/^https?:\/\//i.test(link)) link = "https://" + link;

  let imageUrl = input.imageUrl.trim();
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return { error: "Adresa obrázku musí začínat https://" };

  // Nahraný soubor musí ležet v mé složce bucketu.
  const imagePath = input.imagePath && input.imagePath.startsWith(`${me.userId}/`) ? input.imagePath : null;
  if (input.imagePath && !imagePath) imageUrl = "";

  const data = {
    title,
    description: input.description.trim().slice(0, 2000),
    link: link.slice(0, 2000),
    image_url: imageUrl.slice(0, 2000),
    image_path: imagePath,
  };

  if (input.id) {
    const { data: previous } = await supabase.from("wishes").select("image_path").eq("id", input.id).maybeSingle();
    const { error } = await supabase.from("wishes").update(data).eq("id", input.id);
    if (error) return dbError(error);
    if (previous?.image_path && previous.image_path !== imagePath) {
      await supabase.storage.from(WISH_IMAGES_BUCKET).remove([previous.image_path]);
    }
  } else {
    const { error } = await supabase.from("wishes").insert({ ...data, owner_id: me.id });
    if (error) return dbError(error);
  }

  refresh();
  return {};
}

export async function deleteWish(id: string): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const { data: wish } = await supabase.from("wishes").select("image_path").eq("id", id).maybeSingle();
  const { error } = await supabase.from("wishes").delete().eq("id", id);
  if (error) return dbError(error);
  if (wish?.image_path) await supabase.storage.from(WISH_IMAGES_BUCKET).remove([wish.image_path]);
  refresh();
  return {};
}

/** Uklidí obrázek nahraný v editoru, který se nakonec neuložil. */
export async function discardUpload(path: string): Promise<void> {
  const me = await getMe();
  if (!path.startsWith(`${me.userId}/`)) return;
  const supabase = await createClient();
  const { count } = await supabase
    .from("wishes")
    .select("id", { count: "exact", head: true })
    .eq("image_path", path);
  if (!count) await supabase.storage.from(WISH_IMAGES_BUCKET).remove([path]);
}

// ---------------------------------------------------------------------------
// Obálka a nákupy
// ---------------------------------------------------------------------------

export async function revealEnvelope(): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const result = dbError((await supabase.rpc("reveal_envelope")).error);
  refresh();
  return result;
}

export async function setBought(wishId: string, bought: boolean): Promise<ActionResult> {
  const me = await getMe();
  const supabase = await createClient();
  const { error } = bought
    ? await supabase.from("purchases").upsert({ giver_id: me.id, wish_id: wishId }, { ignoreDuplicates: true })
    : await supabase.from("purchases").delete().eq("giver_id", me.id).eq("wish_id", wishId);
  if (error) return dbError(error);
  refresh();
  return {};
}

// ---------------------------------------------------------------------------
// Správa skupiny (oprávnění kontroluje databáze)
// ---------------------------------------------------------------------------

export async function addParticipant(name: string, email: string): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const result = dbError((await supabase.rpc("add_participant", { p_name: name, p_email: email })).error);
  refresh();
  return result;
}

export async function removeParticipant(id: string): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const result = dbError((await supabase.rpc("remove_participant", { p_id: id })).error);
  refresh();
  return result;
}

export async function updateSettings(budget: string, handover: string): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const result = dbError((await supabase.rpc("update_settings", { p_budget: budget, p_handover: handover })).error);
  refresh();
  return result;
}

export async function runDraw(): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const result = dbError((await supabase.rpc("draw")).error);
  refresh();
  return result;
}

export async function cancelDraw(): Promise<ActionResult> {
  await getMe();
  const supabase = await createClient();
  const result = dbError((await supabase.rpc("cancel_draw")).error);
  refresh();
  return result;
}

// ---------------------------------------------------------------------------
// Účet
// ---------------------------------------------------------------------------

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/prihlaseni");
}
