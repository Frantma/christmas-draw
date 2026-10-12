-- Test RLS a losování nad propojenou databází. Vše běží v transakci a na konci se vrátí (rollback).
-- Spuštění: npm run db:test
begin;
create temp table results(step text, ok boolean, detail text) on commit drop;
grant all on results to authenticated, anon;

-- fiktivní auth uživatelé (jen v transakci)
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000a','martinfran@email.cz','authenticated','authenticated');
-- trigger navázal správce
insert into results select 'admin linked', user_id is not null, null from public.participants where email='martinfran@email.cz';

-- neozvaný e-mail musí selhat
do $$ begin
  insert into auth.users (id, email, aud, role) values ('00000000-0000-0000-0000-0000000000ff','cizi@x.cz','authenticated','authenticated');
  insert into results values ('uninvited blocked', false, 'insert prosel');
exception when others then insert into results values ('uninvited blocked', sqlerrm like '%EMAIL_NOT_INVITED%', sqlerrm); end $$;

-- jako správce přidám 3 lidi
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.add_participant('Jana Test','jana@t.cz');
select public.add_participant('Petr Test','petr@t.cz');
select public.add_participant('Eva Test','eva@t.cz');
reset role;
insert into auth.users (id, email, aud, role) values
 ('00000000-0000-0000-0000-00000000000b','jana@t.cz','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000c','petr@t.cz','authenticated','authenticated'),
 ('00000000-0000-0000-0000-00000000000d','eva@t.cz','authenticated','authenticated');

-- Jana si přidá přání; Jana nesmí losovat
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into public.wishes(owner_id,title) values (public.my_participant_id(),'Hrnek');
do $$ begin perform public.draw(); insert into results values ('non-admin draw blocked', false, null);
exception when others then insert into results values ('non-admin draw blocked', sqlerrm like '%FORBIDDEN%', sqlerrm); end $$;

-- správce losuje
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
select public.draw();
insert into results select 'admin sees only own assignment', count(*)=1, count(*)::text from public.assignments;
insert into results select 'admin cannot see Jana wishes', count(*)=0, count(*)::text from public.wishes where title='Hrnek';
do $$ begin perform public.add_participant('X','x@t.cz'); insert into results values ('group locked after draw', false, null);
exception when others then insert into results values ('group locked after draw', sqlerrm like '%GROUP_LOCKED%', sqlerrm); end $$;
insert into results select 'status', drawn and total=4 and opened=0, format('%s/%s/%s',drawn,opened,total) from public.draw_status();

-- kdo má Janu: před otevřením obálky přání nevidí, po otevření ano
reset role;
create temp table jana_giver as select p.user_id from public.assignments a join public.participants p on p.id=a.giver_id join public.participants r on r.id=a.receiver_id where r.email='jana@t.cz';
grant select on jana_giver to authenticated;
select set_config('test.giver', (select user_id::text from jana_giver), false);
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('test.giver'), 'role','authenticated')::text, true);
insert into results select 'sealed: giftee wishes hidden', count(*)=0, count(*)::text from public.wishes where title='Hrnek';
select public.reveal_envelope();
insert into results select 'opened: giftee wishes visible', count(*)=1, count(*)::text from public.wishes where title='Hrnek';
insert into public.purchases(giver_id,wish_id) select public.my_participant_id(), id from public.wishes where title='Hrnek';
insert into results select 'purchase saved', count(*)=1, null from public.purchases;

-- Jana nesmí vidět, kdo ji koupil, ani cizí assignments
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into results select 'Jana sees no purchases', count(*)=0, count(*)::text from public.purchases;
insert into results select 'Jana sees only own assignment', count(*)=1, count(*)::text from public.assignments;

-- anon nevidí nic, ping funguje
reset role; set local role anon;
insert into results select 'anon sees no participants', count(*)=0, count(*)::text from public.participants;
insert into results select 'anon ping', public.ping(), null;
reset role;
-- nikdo nemá sám sebe, každý dává i dostává právě jednou
insert into results select 'derangement', bool_and(giver_id<>receiver_id) and count(distinct receiver_id)=4, null from public.assignments;

select step, ok, detail from results;
rollback;
