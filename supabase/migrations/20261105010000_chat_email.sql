-- E-mailové upozornění na novou zprávu v chatu (Resend přes pg_net).
--
-- Anonymita:
--  * E-mail odesílá databáze – adresu příjemce nezná aplikace ani odesílatel zprávy.
--  * E-mail obsahuje jen obecnou větu a odkaz; žádný text zprávy, žádné jméno.
--  * Odesílatel e-mailu je vždy stejný (jezisek@frantici.fun), bez reply-to.
-- Proti spamu: e-mail jde jen u první nepřečtené zprávy od dané strany.
-- API klíč Resendu je ve Vault pod názvem 'resend_api_key' (vkládá se mimo migrace).

create extension if not exists pg_net with schema extensions;

create function private.notify_new_message(p_giver_id uuid, p_from_giver boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_key text;
  v_email text;
  v_subject text;
  v_lead text;
  v_link text;
  v_html text;
begin
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'resend_api_key';
  if v_key is null then return; end if;

  -- příjemce e-mailu = druhá strana konverzace
  select p.email into v_email
  from public.assignments a
  join public.participants p on p.id = case when p_from_giver then a.receiver_id else a.giver_id end
  where a.giver_id = p_giver_id;
  if v_email is null then return; end if;

  if p_from_giver then
    v_subject := 'Tvůj Ježíšek ti napsal';
    v_lead := 'Tvůj Tajný Ježíšek ti poslal zprávu. Kdo to je, se dozvíš až při rozbalování.';
    v_link := 'https://vanoce.frantici.fun/zpravy?s=jezisek';
  else
    v_subject := 'Tvůj obdarovaný ti napsal';
    v_lead := 'Člověk, kterého letos obdarováváš, ti poslal zprávu.';
    v_link := 'https://vanoce.frantici.fun/zpravy?s=obdarovany';
  end if;

  v_html := '<!doctype html><html lang="cs"><body style="margin:0;background:#F7F1E5;font-family:Helvetica,Arial,sans-serif;color:#1E2420">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">'
    || '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFDF8;border:1px solid #E4D9C3;border-radius:18px;overflow:hidden">'
    || '<tr><td style="background:#163B2D;padding:22px 28px;color:#F7F1E5;font-family:Georgia,serif;font-size:22px;font-weight:600">'
    || '<span style="color:#C9A14A">&#9733;</span>&nbsp; Tajný Ježíšek</td></tr>'
    || '<tr><td style="padding:28px">'
    || '<h1 style="margin:0 0 12px;font-family:Georgia,serif;font-size:26px;font-weight:600">' || v_subject || '</h1>'
    || '<p style="margin:0 0 24px;font-size:16px;line-height:1.55;color:#5A5F55">' || v_lead || '</p>'
    || '<a href="' || v_link || '" style="display:inline-block;background:#A8232E;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 24px;border-radius:999px">Přečíst zprávu</a>'
    || '</td></tr>'
    || '<tr><td style="padding:0 28px 24px;font-size:13px;color:#8B8A80">Další upozornění přijde, až si zprávy přečteš a dostaneš novou.</td></tr>'
    || '</table></td></tr></table></body></html>';

  perform net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_key, 'Content-Type', 'application/json'),
    body := jsonb_build_object(
      'from', 'Tajný Ježíšek <jezisek@frantici.fun>',
      'to', jsonb_build_array(v_email),
      'subject', v_subject,
      'html', v_html,
      'text', v_subject || E'\n\n' || v_lead || E'\n\nPřečíst zprávu: ' || v_link
    )
  );
end;
$$;

revoke execute on function private.notify_new_message(uuid, boolean) from public, anon, authenticated;

-- send_message: navíc upozornění e-mailem u první nepřečtené zprávy
create or replace function public.send_message(p_kind text, p_body text, p_wish_id uuid default null)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  t record;
  v_body text := btrim(coalesce(p_body, ''));
  v_had_unread boolean;
begin
  select * into t from private.chat_thread(p_kind);
  if t.giver_id is null then raise exception 'NO_CHAT'; end if;
  if not t.can_use then raise exception 'ENVELOPE_SEALED'; end if;
  if char_length(v_body) = 0 then raise exception 'EMPTY_MESSAGE'; end if;
  if char_length(v_body) > 2000 then raise exception 'MESSAGE_TOO_LONG'; end if;
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

  select exists (
    select 1 from public.messages m
    where m.giver_id = t.giver_id and m.from_giver = t.i_am_giver and m.read_at is null
  ) into v_had_unread;

  insert into public.messages (giver_id, from_giver, body, wish_id)
  values (t.giver_id, t.i_am_giver, v_body, p_wish_id);

  perform realtime.send('{}'::jsonb, 'new_message', 'chat:' || t.thread_id::text, true);

  if not v_had_unread then
    perform private.notify_new_message(t.giver_id, t.i_am_giver);
  end if;
end;
$$;
