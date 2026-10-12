"use client";

/* eslint-disable @next/next/no-img-element -- náhled obrázku z libovolné domény */
import { createContext, use, useRef, useState, useTransition } from "react";
import { ImageIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import { discardUpload, saveWish } from "@/app/actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { WISH_IMAGES_BUCKET } from "@/lib/supabase/env";
import type { Wish } from "@/lib/types";

type Form = {
  id: string | null;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  imagePath: string | null;
};

const EMPTY: Form = { id: null, title: "", description: "", link: "", imageUrl: "", imagePath: null };
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const WishEditorContext = createContext<{ open: (wish?: Wish) => void } | null>(null);

export function useWishEditor() {
  const ctx = use(WishEditorContext);
  if (!ctx) throw new Error("useWishEditor musí být uvnitř WishEditorProvider");
  return ctx;
}

export function WishEditorProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, startSaving] = useTransition();
  // Obrázky nahrané v tomto otevření editoru – při zrušení je uklidíme.
  const uploaded = useRef<string[]>([]);
  const savedPath = useRef<string | null>(null);

  function open(wish?: Wish) {
    setForm(
      wish
        ? {
            id: wish.id,
            title: wish.title,
            description: wish.description,
            link: wish.link,
            imageUrl: wish.image_url,
            imagePath: wish.image_path,
          }
        : EMPTY,
    );
    savedPath.current = wish?.image_path ?? null;
    uploaded.current = [];
    setError("");
    setIsOpen(true);
  }

  function close(keep: string | null) {
    for (const path of uploaded.current) {
      if (path !== keep) void discardUpload(path);
    }
    uploaded.current = [];
    setIsOpen(false);
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setError("");
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Vyber prosím soubor s obrázkem.");
    if (file.size > MAX_IMAGE_BYTES) return setError("Obrázek je větší než 4 MB, zkus menší.");

    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const storage = createClient().storage.from(WISH_IMAGES_BUCKET);
    const { error: uploadError } = await storage.upload(path, file, { contentType: file.type });
    setUploading(false);
    if (uploadError) return setError("Obrázek se nepodařilo nahrát, zkus to prosím znovu.");

    uploaded.current.push(path);
    setForm((f) => ({ ...f, imageUrl: storage.getPublicUrl(path).data.publicUrl, imagePath: path }));
    setError("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return setError("Vyplň prosím název dárku.");
    startSaving(async () => {
      const result = await saveWish(form);
      if (result.error) return setError(result.error);
      close(form.imagePath);
      toast.success(form.id ? "Přání upraveno" : "Přání přidáno na seznam");
    });
  }

  const busy = saving || uploading;

  return (
    <WishEditorContext value={{ open }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(next) => !next && !busy && close(savedPath.current)}>
        <DialogContent className="max-h-[94vh] gap-[18px] overflow-y-auto rounded-[22px] p-7 sm:max-w-[600px]">
          <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
            <DialogHeader className="gap-1 pr-10">
              <DialogTitle className="font-heading text-3xl font-semibold">
                {form.id ? "Upravit přání" : "Nové přání"}
              </DialogTitle>
              <DialogDescription>
                Povinný je jen název. Čím víc detailů, tím líp se tvůj Ježíšek trefí.
              </DialogDescription>
            </DialogHeader>

            <FieldGroup className="gap-[18px]">
              <Field>
                <FieldLabel htmlFor="wish-title">Název dárku *</FieldLabel>
                <Input
                  id="wish-title"
                  placeholder="např. Vlněná šála"
                  maxLength={80}
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  autoFocus
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="wish-desc">Popis</FieldLabel>
                <Textarea
                  id="wish-desc"
                  placeholder="Velikost, barva, značka, cokoli, co pomůže"
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="wish-link">Odkaz</FieldLabel>
                <Input
                  id="wish-link"
                  inputMode="url"
                  placeholder="https://"
                  value={form.link}
                  onChange={(e) => set("link", e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="wish-image-url">Obrázek</FieldLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="h-25 w-33 flex-none overflow-hidden rounded-[14px] border">
                    {form.imageUrl ? (
                      <img src={form.imageUrl} alt="Náhled obrázku" className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-accent text-gold-text">
                        <ImageIcon aria-hidden="true" className="size-7.5" strokeWidth={1.8} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild disabled={busy}>
                      <label htmlFor="wish-file" className="cursor-pointer">
                        {uploading ? <Spinner /> : <UploadIcon aria-hidden="true" />}
                        Nahrát z počítače
                      </label>
                    </Button>
                    <input id="wish-file" type="file" accept="image/*" className="sr-only" onChange={onFile} />
                    {form.imageUrl && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="bg-transparent"
                        onClick={() => setForm((f) => ({ ...f, imageUrl: "", imagePath: null }))}
                      >
                        Odebrat
                      </Button>
                    )}
                  </div>
                </div>
                <Input
                  id="wish-image-url"
                  inputMode="url"
                  placeholder="…nebo vlož adresu obrázku z webu"
                  value={form.imagePath ? "" : form.imageUrl}
                  onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value, imagePath: null }))}
                />
              </Field>
            </FieldGroup>

            {error && (
              <Alert variant="destructive" className="border-none bg-[#f6dedf]">
                <AlertDescription className="font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mx-0 mb-0 rounded-none border-t bg-transparent px-0 pt-4 pb-0">
              <Button type="button" variant="ghost" onClick={() => close(savedPath.current)} disabled={busy}>
                Zrušit
              </Button>
              <Button type="submit" disabled={busy}>
                {saving && <Spinner />}
                Uložit přání
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </WishEditorContext>
  );
}
