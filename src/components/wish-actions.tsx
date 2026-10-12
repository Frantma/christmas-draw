"use client";

import { useOptimistic, useTransition } from "react";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteWish, setBought } from "@/app/actions";
import { useWishEditor } from "@/components/wish-editor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { Wish } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AddWishButton({
  children = "Přidat přání",
  icon = true,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & { icon?: boolean }) {
  const editor = useWishEditor();
  return (
    <Button type="button" onClick={() => editor.open()} {...props}>
      {icon && <PlusIcon aria-hidden="true" />}
      {children}
    </Button>
  );
}

export function AddWishTile() {
  const editor = useWishEditor();
  return (
    <button
      type="button"
      onClick={() => editor.open()}
      className="flex min-h-80 flex-col items-center justify-center gap-2.5 rounded-[22px] border-2 border-dashed border-input font-bold text-pine-700 transition-colors outline-none hover:bg-pine-700/5 focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="flex size-13 items-center justify-center rounded-full bg-muted">
        <PlusIcon aria-hidden="true" className="size-6" />
      </span>
      Přidat další přání
    </button>
  );
}

export function MyWishActions({ wish }: { wish: Wish }) {
  const editor = useWishEditor();
  const [deleting, startDelete] = useTransition();

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => editor.open(wish)}>
        <PencilIcon aria-hidden="true" />
        Upravit
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button type="button" variant="destructive" size="sm" className="bg-transparent" disabled={deleting}>
            {deleting ? <Spinner /> : <Trash2Icon aria-hidden="true" />}
            Smazat
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smazat přání?</AlertDialogTitle>
            <AlertDialogDescription>„{wish.title}“ zmizí z tvého seznamu.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Nechat</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                startDelete(async () => {
                  const result = await deleteWish(wish.id);
                  if (result.error) toast.error(result.error);
                  else toast.success("Přání smazáno");
                })
              }
            >
              Smazat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function BuyToggle({ wishId, bought }: { wishId: string; bought: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(bought);
  const [, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      aria-pressed={optimistic}
      className={cn(
        "border-[#d9ccb3] bg-white",
        optimistic && "border-pine-700 bg-pine-700 text-white hover:bg-pine-800 hover:text-white",
      )}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(!optimistic);
          const result = await setBought(wishId, !optimistic);
          if (result.error) toast.error(result.error);
        })
      }
    >
      <CheckIcon key={String(optimistic)} aria-hidden="true" strokeWidth={2.4} className={optimistic ? "pop" : undefined} />
      {optimistic ? "Koupeno" : "Označit jako koupené"}
    </Button>
  );
}
