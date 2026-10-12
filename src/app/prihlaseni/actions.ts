"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; notice?: string; email?: string };

const MIN_PASSWORD = 8;

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Vyplň e-mail i heslo.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Neznámý e-mail nebo špatné heslo.", email };

  // Člen vidí celou skupinu – je potřeba hledat konkrétně svůj řádek.
  const { data: member } = await supabase.from("participants").select("id").eq("user_id", data.user.id).maybeSingle();
  if (!member) {
    await supabase.auth.signOut();
    return { error: "Tenhle účet už není ve skupině. Ozvi se správci.", email };
  }

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!email || !password) return { error: "Vyplň e-mail i heslo.", email };
  if (password.length < MIN_PASSWORD) return { error: `Heslo musí mít aspoň ${MIN_PASSWORD} znaků.`, email };
  if (password !== confirm) return { error: "Hesla se neshodují.", email };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return { error: "Účet s tímto e-mailem už existuje. Přihlas se.", email };
    }
    if (/database error/i.test(error.message)) {
      return { error: "Tenhle e-mail ve skupině není. Požádej správce, ať tě přidá.", email };
    }
    if (/password/i.test(error.message)) {
      return { error: "Heslo je příliš slabé, zkus delší.", email };
    }
    return { error: "Registrace se nepovedla, zkus to prosím znovu.", email };
  }

  // Zapnuté potvrzování e-mailu v Supabase → session hned nevznikne.
  if (!data.session) {
    return { notice: "Účet je vytvořený. Potvrď ho odkazem z e-mailu a pak se přihlas.", email };
  }

  redirect("/");
}
