# Tajný Ježíšek

**Produkce:** https://christmas-draw-rose.vercel.app · Vercel projekt `martin-frantas-projects/christmas-draw` · Supabase `arpiixkrcbwznycupacs`

Push do `main` nasadí produkci automaticky (Vercel ↔ GitHub), push jiné větve vytvoří náhledové nasazení.

Vánoční losování dárků pro rodinu. Next.js 16 (App Router), shadcn/ui + Tailwind CSS v4, Supabase (Auth, Postgres, Storage), nasazení na Vercel.

## Jak to funguje

- **Správce** (`martinfran@email.cz`) přidává účastníky (jméno + e-mail), nastavuje rozpočet a místo předávání a spouští losování.
- **Účastník** se poprvé zaregistruje na `/prihlaseni` → *První přihlášení*. Projde jen e-mail, který správce přidal (hlídá to trigger v databázi).
- Každý si píše přání (název, popis, odkaz, obrázek). Po losování otevře „obálku“ a vidí přání svého obdarovaného. Může si u nich označit „koupeno“ a tuhle značku vidí jen on.
- **Kdo má koho, nevidí nikdo jiný, ani správce.** Hlídá to přímo Postgres přes RLS: každý si přečte jen svůj řádek v `assignments`. Změny skupiny a losování jdou jen přes funkce `security definer`, které ověřují roli správce. Aplikace proto nepotřebuje service role klíč.

## Nastavení Supabase

Celé nastavení je v kódu: schéma v `supabase/migrations/`, nastavení Auth v `supabase/config.toml` (vypnuté potvrzování e-mailu, heslo aspoň 8 znaků). Vestavěné SMTP na free tieru posílá jen pár e-mailů za hodinu, a to jen členům týmu, proto je potvrzování vypnuté. Registraci stejně hlídá whitelist e-mailů.

```bash
npm run db:login                          # jednou, přihlásí CLI přes prohlížeč
npm run db:link -- --project-ref <ref>    # jednou, ref je v URL projektu v dashboardu
npm run db:deploy                         # migrace + nastavení Auth
```

Migrace vytvoří tabulky, RLS, funkce, bucket `wish-images` a správce `martinfran@email.cz`. Nová změna schématu se přidává jako nový soubor: `npx supabase migration new <nazev>`, potom `npm run db:deploy`.

Produkční doména je v `supabase/config.toml` (`site_url`). Když se změní, uprav ji tam a spusť `npm run db:config`.

## Proměnné prostředí

Zkopíruj `.env.example` do `.env.local` (lokálně) a stejné hodnoty zadej ve Vercelu (*Settings → Environment Variables*):

| Proměnná | Kde ji najdeš |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (publishable, nebo starší anon key) |
| `CRON_SECRET` | libovolný dlouhý náhodný řetězec, např. `openssl rand -hex 32` |

## Keep-alive pro free tier

Supabase na free tieru uspí projekt po 7 dnech bez aktivity. `vercel.json` proto definuje Vercel Cron, který každý den v 6:00 UTC zavolá `/api/keepalive`. Endpoint ověří `CRON_SECRET` (Vercel ho posílá v hlavičce `Authorization`) a zavolá v databázi funkci `ping()`. Na Hobby plánu Vercelu je denní cron zdarma.

Ruční test:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<domena>/api/keepalive
```

## Vývoj

```bash
npm install
npm run dev
```

Stránky: `/` přehled, `/prani` moje přání, `/komu-davam` obdarovaný, `/sprava` správa skupiny (jen správce), `/prihlaseni`.

UI komponenty jsou ze shadcn/ui (`src/components/ui`), další přidáš přes `npx shadcn@latest add <komponenta>`. Barvy z prototypu jsou nastavené jako theme proměnné v `src/app/globals.css`.

## Známá omezení

- Bez SMTP nejde obnovit zapomenuté heslo e-mailem. Správce může heslo resetovat v Supabase dashboardu (*Authentication → Users*). Až bude potřeba, stačí nastavit vlastní SMTP (třeba Resend) a doplnit stránku pro reset hesla.
- Registraci za člověka by mohl udělat i někdo jiný, kdo zná jeho e-mail, pokud ho předběhne. Pro rodinnou skupinu je to přijatelné riziko.
