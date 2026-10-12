"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { signIn, signUp, type AuthState } from "./actions";

export function AuthForm({ initialError }: { initialError?: string }) {
  const [loginState, loginAction, loggingIn] = useActionState(signIn, { error: initialError });
  const [signupState, signupAction, signingUp] = useActionState(signUp, {});

  return (
    <Tabs defaultValue="login" className="gap-5">
      <TabsList className="h-11! w-full rounded-full bg-muted p-1 sm:w-fit">
        <TabsTrigger value="login" className="rounded-full px-4 text-sm font-semibold">
          Přihlášení
        </TabsTrigger>
        <TabsTrigger value="signup" className="rounded-full px-4 text-sm font-semibold">
          První přihlášení
        </TabsTrigger>
      </TabsList>

      <TabsContent value="login" className="flex flex-col gap-5">
        <Intro title="Přihlášení">Přihlas se e-mailem, který máš od správce skupiny.</Intro>
        <form action={loginAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="login-email">E-mail</FieldLabel>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="jmeno@example.cz"
                defaultValue={loginState.email}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="login-password">Heslo</FieldLabel>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Tvoje heslo"
                required
              />
            </Field>
            <Message state={loginState} />
            <Button type="submit" size="lg" className="w-full" disabled={loggingIn}>
              {loggingIn && <Spinner />}
              Přihlásit se
            </Button>
          </FieldGroup>
        </form>
      </TabsContent>

      <TabsContent value="signup" className="flex flex-col gap-5">
        <Intro title="Nastav si heslo">
          Poprvé tady? Zadej e-mail, který do skupiny přidal správce, a vymysli si heslo.
        </Intro>
        <form action={signupAction}>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="signup-email">E-mail</FieldLabel>
              <Input
                id="signup-email"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="jmeno@example.cz"
                defaultValue={signupState.email}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-password">Heslo</FieldLabel>
              <Input
                id="signup-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
              <FieldDescription>Aspoň 8 znaků.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="signup-confirm">Heslo znovu</FieldLabel>
              <Input
                id="signup-confirm"
                name="confirm"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
            <Message state={signupState} />
            <Button type="submit" size="lg" className="w-full" disabled={signingUp}>
              {signingUp && <Spinner />}
              Vytvořit účet
            </Button>
          </FieldGroup>
        </form>
      </TabsContent>
    </Tabs>
  );
}

function Intro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h2 className="font-heading text-[32px] font-semibold">{title}</h2>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

function Message({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <Alert variant="destructive" className="border-none bg-[#f6dedf]">
        <AlertDescription className="font-semibold">{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.notice) {
    return (
      <Alert className="border-none bg-[#e3ecdf] text-pine-800">
        <AlertDescription className="font-semibold text-pine-800">{state.notice}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
