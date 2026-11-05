-- Test anonymního chatu nad propojenou databází. Vše běží v transakci a na konci se vrátí (rollback).
-- Spuštění: npm run db:test
begin;
create temp table results(step text, ok boolean, detail text) on commit drop;
grant all on results to authenticated, anon;

-- E-maily: bez klíče se nic neposílá; v testu dočasný klíč (v transakci se nic neodešle)
select vault.create_secret('re_test_key', 'resend_api_key')
where not exists (select 1 from vault.secrets where name = 'resend_api_key');
create temp table queue_before as select coalesce(max(id), 0) as max_id from net.http_request_queue;

-- Fiktivní skupina: skutečný správce + 3 testovací lidé (jen v transakci)
select set_config('test.admin', (select user_id::text from public.participants where is_admin limit 1), false);

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role','authenticated')::text, true);
select public.cancel_draw();
select public.add_participant('Jana Chat','jana.chat@t.cz');
select public.add_participant('Petr Chat','petr.chat@t.cz');
select public.add_participant('Eva Chat','eva.chat@t.cz');
reset role;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000b','jana.chat@t.cz','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','petr.chat@t.cz','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000d','eva.chat@t.cz','authenticated','authenticated');
-- Ve skupině smí být jen testovací lidé + správce
delete from public.participants
 where not is_admin and email not in ('jana.chat@t.cz','petr.chat@t.cz','eva.chat@t.cz');

-- Jana si přidá přání, Petr taky
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into public.wishes(owner_id,title) values (public.my_participant_id(),'Hrnek');
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}', true);
insert into public.wishes(owner_id,title) values (public.my_participant_id(),'Petrova deskovka');

-- Správce losuje
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role','authenticated')::text, true);
select public.draw();
reset role;

-- G = Janin Ježíšek, X = někdo, kdo není ani G, ani Jana
create temp table roles_map as
select
  (select p.user_id from public.assignments a join public.participants p on p.id = a.giver_id
     join public.participants r on r.id = a.receiver_id where r.email = 'jana.chat@t.cz') as g_uid,
  (select p.user_id from public.participants p
     where p.email <> 'jana.chat@t.cz'
       and p.id <> (select a.giver_id from public.assignments a join public.participants r on r.id = a.receiver_id where r.email = 'jana.chat@t.cz')
     limit 1) as x_uid,
  (select a.thread_id from public.assignments a join public.participants r on r.id = a.receiver_id where r.email = 'jana.chat@t.cz') as jana_thread,
  (select p.name from public.participants p join public.assignments a on a.giver_id = p.id
     join public.participants r on r.id = a.receiver_id where r.email = 'jana.chat@t.cz') as g_name,
  (select p.id::text from public.participants p join public.assignments a on a.giver_id = p.id
     join public.participants r on r.id = a.receiver_id where r.email = 'jana.chat@t.cz') as g_pid;
grant select on roles_map to authenticated;
select set_config('test.g', (select g_uid::text from roles_map), false);
select set_config('test.x', (select x_uid::text from roles_map), false);
select set_config('test.topic', 'chat:' || (select jana_thread::text from roles_map), false);
select set_config('test.gname', (select g_name from roles_map), false);
select set_config('test.gpid', (select g_pid from roles_map), false);
select set_config('test.foreign_wish', (select id::text from public.wishes where title = 'Petrova deskovka'), false);

set local role authenticated;

-- 1) Jana píše svému Ježíškovi ještě před tím, než si G otevře obálku
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
select public.send_message('santa', 'Ahoj Ježíšku, hrnek klidně modrý');
insert into results select 'Jana: santa chat bez jména a barvy', title is null and color is null and can_write, coalesce(title,'∅') from public.my_chats() where kind = 'santa';

-- 2) G před otevřením obálky
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.g'), 'role','authenticated')::text, true);
insert into results select 'G před obálkou: neví jméno', title is null and not can_write and unread = 0, coalesce(title,'∅') || ' unread=' || unread from public.my_chats() where kind = 'giftee';
insert into results select 'G před obálkou: zprávy nečte', count(*) = 0, count(*)::text from public.chat_messages('giftee');
do $$ begin perform public.send_message('giftee', 'test'); insert into results values ('G před obálkou: nemůže psát', false, null);
exception when others then insert into results values ('G před obálkou: nemůže psát', sqlerrm like '%ENVELOPE_SEALED%', sqlerrm); end $$;

-- 3) G otevře obálku a odpoví s odkazem na Janino přání
select public.reveal_envelope();
insert into results select 'G po obálce: vidí Janu a 1 nepřečtenou', title = 'Jana Chat' and can_write and unread = 1, title || ' unread=' || unread from public.my_chats() where kind = 'giftee';
select public.send_message('giftee', 'Jakou velikost hrnku?', (select id from public.wishes where title = 'Hrnek'));
do $$ begin perform public.send_message('giftee', 'cizí přání', current_setting('test.foreign_wish')::uuid);
  insert into results values ('G nemůže odkázat na cizí přání', false, null);
exception when others then insert into results values ('G nemůže odkázat na cizí přání', sqlerrm like '%INVALID_WISH%', sqlerrm); end $$;
select public.send_message('giftee', 'A jakou barvu?');
insert into results select 'G vidí 3 zprávy, svoje jako mine', count(*) = 3 and bool_or(mine) and bool_or(not mine), count(*)::text from public.chat_messages('giftee');

-- 4) Jana: vidí zprávy, ale nic o odesílateli
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into results select 'Jana vidí 3 zprávy, odkaz na Hrnek', count(*) = 3 and bool_or(wish_title = 'Hrnek'), count(*)::text from public.chat_messages('santa');
insert into results select 'Jana: v datech zprávy není jméno ani ID dárce',
  not bool_or(row_to_json(c)::text like '%' || current_setting('test.gname') || '%'
           or row_to_json(c)::text like '%' || current_setting('test.gpid') || '%'
           or row_to_json(c)::text like '%' || current_setting('test.g') || '%'),
  null from public.chat_messages('santa') c;
insert into results select 'Jana: chat_messages má jen povolené sloupce',
  (select array_agg(k order by k) from json_object_keys(row_to_json(c)) k) = array['body','created_at','id','mine','wish_title'],
  null from public.chat_messages('santa') c limit 1;
insert into results select 'Jana: my_chats neobsahuje jméno ani ID dárce',
  not bool_or(row_to_json(c)::text like '%' || current_setting('test.gname') || '%'
           or row_to_json(c)::text like '%' || current_setting('test.gpid') || '%'), null from public.my_chats() c;
insert into results select 'Jana nečte tabulku messages přímo', count(*) = 0, count(*)::text from public.messages;
insert into results select 'Jana nevidí řádek losování dárce', count(*) = 0, count(*)::text
  from public.assignments where giver_id::text = current_setting('test.gpid');
do $$ begin perform private.chat_thread('santa'); insert into results values ('Jana nemůže volat private.chat_thread', false, null);
exception when others then insert into results values ('Jana nemůže volat private.chat_thread', sqlerrm like '%permission denied%', sqlerrm); end $$;
insert into results select 'Jana: 2 nepřečtené před přečtením', unread = 2, unread::text from public.my_chats() where kind = 'santa';
select public.mark_chat_read('santa');
insert into results select 'Jana: 0 nepřečtených po přečtení', unread = 0, unread::text from public.my_chats() where kind = 'santa';

-- 5) Realtime: kanál Janiny konverzace smí poslouchat jen Jana a G (funkce z policy na realtime.messages)
insert into results select 'Realtime: Jana smí poslouchat svůj kanál', private.can_access_chat_topic(current_setting('test.topic')), null;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.g'), 'role','authenticated')::text, true);
insert into results select 'Realtime: G smí poslouchat kanál', private.can_access_chat_topic(current_setting('test.topic')), null;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.x'), 'role','authenticated')::text, true);
insert into results select 'Realtime: nezúčastněný kanál neslyší', not private.can_access_chat_topic(current_setting('test.topic')), null;
insert into results select 'Realtime: náhodný kanál nikdo neslyší', not private.can_access_chat_topic('chat:' || gen_random_uuid()::text), null;
reset role;
insert into results select 'Realtime: signál v DB (je-li oddíl) neobsahuje jméno ani ID dárce',
  coalesce(not bool_or(payload::text like '%' || current_setting('test.gpid') || '%' or payload::text like '%' || current_setting('test.gname') || '%'), true),
  coalesce(string_agg(payload::text, ' | '), 'bez oddílu – signál se v testu neuloží') from realtime.messages where topic = current_setting('test.topic');
set local role authenticated;

-- 6) Nezúčastněný ani správce Janinu konverzaci nevidí
insert into results select 'Nezúčastněný nevidí Janiny zprávy', count(*) = 0, count(*)::text
  from (select * from public.chat_messages('santa') union all select * from public.chat_messages('giftee')) c
  where c.body in ('Ahoj Ježíšku, hrnek klidně modrý', 'Jakou velikost hrnku?');
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role','authenticated')::text, true);
insert into results select 'Správce nečte cizí zprávy', count(*) = 0, count(*)::text
  from (select * from public.chat_messages('santa') union all select * from public.chat_messages('giftee')) c
  where c.body in ('Ahoj Ježíšku, hrnek klidně modrý', 'Jakou velikost hrnku?')
    and current_setting('test.g') <> current_setting('test.admin');

-- 7) Anon nemá přístup
reset role; set local role anon;
do $$ begin perform public.my_chats(); insert into results values ('Anon nemůže volat my_chats', false, null);
exception when others then insert into results values ('Anon nemůže volat my_chats', sqlerrm like '%permission denied%', sqlerrm); end $$;
reset role;

-- 8) E-maily ve frontě pg_net (v transakci, nic se neodešle)
reset role;
create temp table mails as
select convert_from(q.body, 'UTF8')::jsonb as b from net.http_request_queue q
where q.id > (select max_id from queue_before) and q.url = 'https://api.resend.com/emails';
insert into results select 'E-mail: Ježíšek dostal 1 upozornění (Jana psala jednou)',
  count(*) = 1, count(*)::text from mails m
  where m.b->'to'->>0 = (select email from public.participants where user_id::text = current_setting('test.g'));
insert into results select 'E-mail: Jana dostala jen 1 upozornění na 2 zprávy za sebou',
  count(*) = 1, count(*)::text from mails m where m.b->'to'->>0 = 'jana.chat@t.cz';
insert into results select 'E-mail Janě neobsahuje jméno, e-mail ani ID dárce ani text zprávy',
  not bool_or(m.b::text like '%' || current_setting('test.gname') || '%'
           or m.b::text like '%' || (select email from public.participants where user_id::text = current_setting('test.g')) || '%'
           or m.b::text like '%' || current_setting('test.gpid') || '%'
           or m.b::text like '%velikost hrnku%'),
  max(m.b->>'subject') from mails m where m.b->'to'->>0 = 'jana.chat@t.cz';
insert into results select 'E-mail jde z jezisek@frantici.fun bez reply-to',
  bool_and(m.b->>'from' = 'Tajný Ježíšek <jezisek@frantici.fun>' and not (m.b ? 'reply_to')), null from mails m;
insert into results select 'E-maily nedostal nikdo jiný', count(*) = 2, count(*)::text from mails;

-- 8) Zrušení losování smaže zprávy
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.admin'), 'role','authenticated')::text, true);
select public.cancel_draw();
reset role;
insert into results select 'Zrušení losování smaže zprávy', count(*) = 0, count(*)::text from public.messages;

select step, ok, detail from results;
rollback;
