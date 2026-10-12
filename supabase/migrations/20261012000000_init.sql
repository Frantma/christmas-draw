-- Tajný Ježíšek – schéma databáze
--
-- Bezpečnostní model:
--  * Každý přihlášený uživatel je navázaný na řádek v `participants` (podle e-mailu).
--  * Registrovat se může jen e-mail, který správce předem přidal (trigger na auth.users).
--  * Dvojice z losování (`assignments`) si každý čte jen svůj řádek – ani správce nevidí ostatní.
--  * Přání vidí jen jejich autor a ten, kdo si autora vylosoval (a už otevřel obálku).
--  * Značky „koupeno“ (`purchases`) vidí jen ten, kdo je nastavil.
--  * Změny skupiny a losování jdou jen přes funkce níže, které kontrolují roli správce.

-- ---------------------------------------------------------------------------
-- Tabulky
-- ---------------------------------------------------------------------------

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  email text not null unique check (email = lower(email)),
  is_admin boolean not null default false,
  color text not null default '#1F4D3A',
  user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.settings (
  id int primary key default 1 check (id = 1),
  budget text not null default '' check (char_length(budget) <= 120),
  handover text not null default '' check (char_length(handover) <= 200),
  drawn_at timestamptz
);

create table public.assignments (
  giver_id uuid primary key references public.participants (id) on delete cascade,
  receiver_id uuid not null unique references public.participants (id) on delete cascade,
  revealed_at timestamptz,
  check (giver_id <> receiver_id)
);

create table public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.participants (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  link text not null default '' check (char_length(link) <= 2000),
  image_url text not null default '' check (char_length(image_url) <= 2000),
  -- cesta v bucketu wish-images, pokud byl obrázek nahraný (kvůli mazání)
  image_path text,
  created_at timestamptz not null default now()
);
create index wishes_owner_idx on public.wishes (owner_id, created_at);

create table public.purchases (
  giver_id uuid not null references public.participants (id) on delete cascade,
  wish_id uuid not null references public.wishes (id) on delete cascade,
  primary key (giver_id, wish_id)
);

-- ---------------------------------------------------------------------------
-- Pomocné funkce
-- ---------------------------------------------------------------------------

create function public.my_participant_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.participants where user_id = auth.uid()
$$;

create function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select is_admin from public.participants where user_id = auth.uid()), false)
$$;

-- Komu dávám – jen pokud už je obálka otevřená.
create function public.my_receiver_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select a.receiver_id
  from public.assignments a
  where a.giver_id = public.my_participant_id() and a.revealed_at is not null
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.participants enable row level security;
alter table public.settings enable row level security;
alter table public.assignments enable row level security;
alter table public.wishes enable row level security;
alter table public.purchases enable row level security;

create policy "members read group" on public.participants
  for select to authenticated
  using (public.my_participant_id() is not null);

create policy "members read settings" on public.settings
  for select to authenticated
  using (public.my_participant_id() is not null);

create policy "read own assignment" on public.assignments
  for select to authenticated
  using (giver_id = public.my_participant_id());

create policy "read own and giftee wishes" on public.wishes
  for select to authenticated
  using (owner_id = public.my_participant_id() or owner_id = public.my_receiver_id());

create policy "insert own wishes" on public.wishes
  for insert to authenticated
  with check (owner_id = public.my_participant_id());

create policy "update own wishes" on public.wishes
  for update to authenticated
  using (owner_id = public.my_participant_id())
  with check (owner_id = public.my_participant_id());

create policy "delete own wishes" on public.wishes
  for delete to authenticated
  using (owner_id = public.my_participant_id());

create policy "read own purchases" on public.purchases
  for select to authenticated
  using (giver_id = public.my_participant_id());

create policy "mark giftee wishes" on public.purchases
  for insert to authenticated
  with check (
    giver_id = public.my_participant_id()
    and exists (
      select 1 from public.wishes w
      where w.id = wish_id and w.owner_id = public.my_receiver_id()
    )
  );

create policy "unmark own purchases" on public.purchases
  for delete to authenticated
  using (giver_id = public.my_participant_id());

-- ---------------------------------------------------------------------------
-- Registrace jen pro pozvané e-maily
-- ---------------------------------------------------------------------------

create function public.handle_new_auth_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.participants
     set user_id = new.id
   where email = lower(new.email) and user_id is null;
  if not found then
    raise exception 'EMAIL_NOT_INVITED';
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------------
-- Funkce volané aplikací
-- ---------------------------------------------------------------------------

-- Přehled skupiny včetně počtu přání (samotná přání ostatních vidět nejsou).
create function public.group_members()
returns table (id uuid, name text, email text, color text, is_admin boolean, wish_count int)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name, p.email, p.color, p.is_admin,
         (select count(*)::int from public.wishes w where w.owner_id = p.id)
  from public.participants p
  where public.my_participant_id() is not null
  order by p.is_admin desc, p.created_at
$$;

-- Stav losování: jen souhrnná čísla, žádné dvojice.
create function public.draw_status()
returns table (drawn boolean, opened int, total int)
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.assignments),
         (select count(*)::int from public.assignments where revealed_at is not null),
         (select count(*)::int from public.participants)
  where public.my_participant_id() is not null
$$;

create function public.add_participant(p_name text, p_email text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_email text := lower(trim(coalesce(p_email, '')));
  v_palette text[] := array['#1F4D3A', '#A8232E', '#2F5D7C', '#6B3A5B', '#7A5A2E', '#3E6B4F', '#8E3B2E', '#3B4C7A'];
  v_count int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from public.assignments) then raise exception 'GROUP_LOCKED'; end if;
  if v_name = '' or v_email = '' then raise exception 'MISSING_FIELDS'; end if;
  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'INVALID_EMAIL'; end if;
  if exists (select 1 from public.participants where email = v_email) then raise exception 'EMAIL_TAKEN'; end if;

  select count(*) into v_count from public.participants;
  insert into public.participants (name, email, color, user_id)
  values (
    v_name, v_email, v_palette[(v_count % array_length(v_palette, 1)) + 1],
    -- pokud už účet s tímto e-mailem existuje (byl dřív odebrán), rovnou ho navážeme
    (select u.id from auth.users u where lower(u.email) = v_email
       and not exists (select 1 from public.participants p where p.user_id = u.id))
  );
end;
$$;

create function public.remove_participant(p_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  if exists (select 1 from public.assignments) then raise exception 'GROUP_LOCKED'; end if;
  delete from public.participants where id = p_id and not is_admin;
end;
$$;

create function public.update_settings(p_budget text, p_handover text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  update public.settings
     set budget = left(trim(coalesce(p_budget, '')), 120),
         handover = left(trim(coalesce(p_handover, '')), 200)
   where id = 1;
end;
$$;

-- Losování: náhodné pořadí a každý obdarovává dalšího v kruhu.
-- Nikdo tak nikdy nedostane sám sebe a vznikne jeden velký kruh.
create function public.draw()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_ids uuid[];
  v_n int;
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  select array_agg(id order by random()) into v_ids from public.participants;
  v_n := coalesce(array_length(v_ids, 1), 0);
  if v_n < 3 then raise exception 'NOT_ENOUGH_PARTICIPANTS'; end if;

  delete from public.purchases where true;
  delete from public.assignments where true;
  insert into public.assignments (giver_id, receiver_id)
  select v_ids[i], v_ids[(i % v_n) + 1] from generate_series(1, v_n) as i;
  update public.settings set drawn_at = now() where id = 1;
end;
$$;

create function public.cancel_draw()
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
  delete from public.purchases where true;
  delete from public.assignments where true;
  update public.settings set drawn_at = null where id = 1;
end;
$$;

create function public.reveal_envelope()
returns void
language sql security definer set search_path = ''
as $$
  update public.assignments
     set revealed_at = now()
   where giver_id = public.my_participant_id() and revealed_at is null
$$;

-- Keep-alive pro free tier (volá denní cron, i bez přihlášení).
create function public.ping()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.settings)
$$;

-- ---------------------------------------------------------------------------
-- Práva na funkce: Supabase defaultně povoluje vše rolím anon i authenticated
-- ---------------------------------------------------------------------------

revoke execute on all functions in schema public from public, anon;
grant execute on function
  public.my_participant_id(), public.is_admin(), public.my_receiver_id(),
  public.group_members(), public.draw_status(),
  public.add_participant(text, text), public.remove_participant(uuid),
  public.update_settings(text, text), public.draw(), public.cancel_draw(),
  public.reveal_envelope(), public.ping()
to authenticated;
grant execute on function public.ping() to anon;
revoke execute on function public.handle_new_auth_user() from authenticated;

-- ---------------------------------------------------------------------------
-- Úložiště obrázků k přáním
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wish-images', 'wish-images', true, 4194304, array['image/*']);

create policy "upload own wish images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'wish-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "delete own wish images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'wish-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Výchozí data
-- ---------------------------------------------------------------------------

insert into public.settings (id, budget, handover) values (1, 'do 800 Kč', '');

insert into public.participants (name, email, is_admin, color)
values ('Martin Franta', 'martinfran@email.cz', true, '#1F4D3A');
