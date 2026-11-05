-- Odesílatel upozornění zpět na jezisek@frantici.fun
-- (v Resendu je teď ověřená i hlavní doména frantici.fun).

create or replace function private.notify_new_message(p_giver_id uuid, p_from_giver boolean)
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
