import Link from "next/link";
import { LogOutIcon } from "lucide-react";
import { signOut } from "@/app/actions";
import { AppNav } from "@/components/app-nav";
import { StarMark } from "@/components/brand";
import { PersonAvatar } from "@/components/person-avatar";
import { MotionProvider } from "@/components/transitions";
import { WishEditorProvider } from "@/components/wish-editor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getMe } from "@/lib/data";
import { firstName } from "@/lib/format";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await getMe();

  return (
    <MotionProvider>
      <WishEditorProvider userId={me.userId}>
        <header className="bg-pine-900 text-cream">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1.5 px-4 pt-2.5 pb-2 sm:gap-x-6 sm:gap-y-3 sm:px-6 sm:py-3.5">
            <Link
              href="/"
              className="group flex min-h-11 items-center gap-2.5 py-1.5 text-cream no-underline hover:text-white"
            >
              <StarMark className="twinkle text-gold" />
              <span className="font-heading text-[21px] font-semibold">Tajný Ježíšek</span>
            </Link>
            <AppNav isAdmin={me.is_admin} />
            <div className="order-2 ml-auto flex items-center gap-2.5">
              <PersonAvatar
                name={me.name}
                color={me.color}
                className="size-[38px] ring-2 ring-gold"
                textClassName="text-sm"
              />
              <span className="hidden text-[15px] font-semibold min-[421px]:inline">{firstName(me.name)}</span>
              <form action={signOut}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      variant="onDark"
                      size="icon"
                      className="border-transparent"
                      aria-label="Odhlásit se"
                    >
                      <LogOutIcon aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Odhlásit se</TooltipContent>
                </Tooltip>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-[1200px] px-4 pt-5 pb-12 sm:px-6 sm:pt-8 sm:pb-16">{children}</main>
        <footer className="border-t p-6 text-center text-sm text-muted-foreground">
          Tajný Ježíšek · Veselé Vánoce
        </footer>
      </WishEditorProvider>
    </MotionProvider>
  );
}
