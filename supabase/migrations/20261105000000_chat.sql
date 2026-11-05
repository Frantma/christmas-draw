-- Anonymní chat mezi Ježíškem (dárcem) a obdarovaným.
--
-- Anonymita:
--  * Tabulka `messages` nemá žádnou select policy – nikdo ji nečte přímo.
--  * Přístup jen přes funkce níže; ty obdarovanému NIKDY nevrací ID ani jméno dárce.
--  * Pomocné funkce, které s giver_id pracují, jsou ve schématu `private`
--    (není vystavené přes API a role authenticated ho nemůže volat).
--  * Realtime nese jen prázdný signál „new_message“ do privátního kanálu
--    `chat:<thread_id>`; thread_id je náhodné UUID bez vazby na účastníky.
--  * Nevystavujeme „přečteno“, online stav ani „píše…“.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Neprůhledný identifikátor konverzace (název realtime kanálu)
alter table public.assignments
  add column thread_id uuid not null default gen_random_uuid() unique;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  giver_id uuid not null references public.assignments (giver_id) on delete cascade,
  -- true = napsal Ježíšek (dárce), false = napsal obdarovaný
  from_giver boolean not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  wish_id uuid references public.wishes (id) on delete set null,
  created_at timestamptz not null default now(),
  -- jen pro počet nepřečtených u příjemce, druhé straně se nezobrazuje
  read_at timestamptz
);
create index messages_thread_idx on public.messages (giver_id, created_at);

alter table public.messages enable row level security;
-- Záměrně žádné policies.

-- ---------------------------------------------------------------------------
-- Interní: moje strana konverzace ('giftee' = píšu svému obdarovanému,
-- 'santa' = píšu svému Ježíškovi). Vrací giver_id → nesmí být veřejné.
-- ---------------------------------------------------------------------------

create function private.chat_thread(p_kind text)
returns table (giver_id uuid, receiver_id uuid, thread_id uuid, i_am_giver boolean, can_use boolean)
language sql stable security definer set search_path = ''
as $$
  select a.giver_id, a.receiver_id, a.thread_id, true, a.revealed_at is not null
  from public.assignments a
  where p_kind = 'giftee' and a.giver_id = public.my_participant_id()
  union all
  select a.giver_id, a.receiver_id, a.thread_id, false, true
  from public.assignments a
  where p_kind = 'santa' and a.receiver_id = public.my_participant_id()
$$;

-- Smí přihlášený uživatel poslouchat daný realtime kanál?
create function private.can_access_chat_topic(p_topic text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.assignments a
    where 'chat:' || a.thread_id::text = p_topic
      and (
        (a.giver_id = public.my_participant_id() and a.revealed_at is not null)
        or a.receiver_id = public.my_participant_id()
      )
  )
$$;

revoke execute on all functions in schema private from public, anon, authenticated;
-- Realtime policy se vyhodnocuje jako authenticated → potřebuje jen tuhle jednu funkci.
grant usage on schema private to authenticated;
grant execute on function private.can_access_chat_topic(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Veřejné funkce pro aplikaci
-- ---------------------------------------------------------------------------

-- Moje konverzace. U „santa“ se o dárci nevrací nic kromě počtu nepřečtených.
-- Jméno obdarovaného jen po otevření obálky.
create function public.my_chats()
returns table (kind text, thread_id uuid, title text, color text, can_write boolean, unread int)
language sql stable security definer set search_path = ''
as $$
  select 'giftee'::text, a.thread_id,
         case when a.revealed_at is not null then r.name end,
         case when a.revealed_at is not null then r.color end,
         a.revealed_at is not null,
         case when a.revealed_at is not null then
           (select count(*)::int from public.messages m
             where m.giver_id = a.giver_id and not m.from_giver and m.read_at is null)
         else 0 end
  from public.assignments a
  join public.participants r on r.id = a.receiver_id
  where a.giver_id = public.my_participant_id()
  union all
  select 'santa'::text, a.thread_id, null, null, true,
         (select count(*)::int from public.messages m
           where m.giver_id = a.giver_id and m.from_giver and m.read_at is null)
  from public.assignments a
  where a.receiver_id = public.my_participant_id()
$$;

-- Zprávy konverzace. Bez ID účastníků, bez read_at.
create function public.chat_messages(p_kind text)
returns table (id uuid, mine boolean, body text, wish_title text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select m.id, m.from_giver = t.i_am_giver, m.body, w.title, m.created_at
  from private.chat_thread(p_kind) t
  join public.messages m on m.giver_id = t.giver_id
  left join public.wishes w on w.id = m.wish_id
  where t.can_use
  order by m.created_at, m.id
$$;

create function public.send_message(p_kind text, p_body text, p_wish_id uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
  v_body text := btrim(coalesce(p_body, ''));
begin
  select * into t from private.chat_thread(p_kind);
  if t.giver_id is null then raise exception 'NO_CHAT'; end if;
  if not t.can_use then raise exception 'ENVELOPE_SEALED'; end if;
  if char_length(v_body) = 0 then raise exception 'EMPTY_MESSAGE'; end if;
  if char_length(v_body) > 2000 then raise exception 'MESSAGE_TOO_LONG'; end if;
  -- odkazovat jde jen na přání obdarovaného z téhle konverzace
  if p_wish_id is not null and not exists (
    select 1 from public.wishes w where w.id = p_wish_id and w.owner_id = t.receiver_id
  ) then
    raise exception 'INVALID_WISH';
  end if;
  if (select count(*) from public.messages m
       where m.giver_id = t.giver_id and m.from_giver = t.i_am_giver
         and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'RATE_LIMIT';
  end if;

  insert into public.messages (giver_id, from_giver, body, wish_id)
  values (t.giver_id, t.i_am_giver, v_body, p_wish_id);

  -- jen signál, žádná data o odesílateli
  perform realtime.send('{}'::jsonb, 'new_message', 'chat:' || t.thread_id::text, true);
end;
$$;

-- Označí zprávy od druhé strany jako přečtené (jen pro počítadlo nepřečtených).
create function public.mark_chat_read(p_kind text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
begin
  select * into t from private.chat_thread(p_kind);
  if t.giver_id is null or not t.can_use then return; end if;
  update public.messages m
     set read_at = now()
   where m.giver_id = t.giver_id and m.from_giver <> t.i_am_giver and m.read_at is null;
end;
$$;

revoke execute on function
  public.my_chats(), public.chat_messages(text), public.send_message(text, text, uuid), public.mark_chat_read(text)
from public, anon;
grant execute on function
  public.my_chats(), public.chat_messages(text), public.send_message(text, text, uuid), public.mark_chat_read(text)
to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: privátní broadcast kanál chat:<thread_id> jen pro obě strany
-- ---------------------------------------------------------------------------

create policy "chat participants receive signals" on realtime.messages
  for select to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and private.can_access_chat_topic((select realtime.topic()))
  );
