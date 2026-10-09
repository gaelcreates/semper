-- Semper · base de données (à coller une fois dans Supabase > SQL Editor)
-- Chaque créateur ne voit que ses lignes. L'admin (table admins) voit tout, et lui seul voit la prospection.

-- Profil : créé automatiquement à l'inscription, avec les réponses du premier passage.
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  first_name text not null default '',
  handle text not null default '',
  rythme int not null default 2,
  durations jsonb not null default '{"ecriture": 30, "tournage": 20, "montage": 45}',
  answers jsonb not null default '{}',
  fields jsonb,
  structures jsonb,
  rythme_locked_until date,
  created_at timestamptz not null default now(),
  seen_at timestamptz not null default now()
);

-- Contenus : les dates restent en heure locale du créateur, écrites « AAAA-MM-JJTHH:MM ».
create table public.contents (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  title text not null default '',
  publish_at text,
  published_at text,
  steps jsonb not null,
  field_values jsonb not null default '{}',
  script jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contents_user on public.contents (user_id);

-- Prospection : invisible pour les créateurs.
create table public.leads (
  user_id uuid primary key references auth.users on delete cascade,
  status text not null default 'verifier',
  note text not null default '',
  updated_at timestamptz not null default now()
);

-- Relevés Instagram quotidiens (écrits par le serveur seulement).
create table public.ig_snapshots (
  handle text not null,
  day date not null,
  followers int,
  media int,
  avg_likes numeric,
  avg_comments numeric,
  profile jsonb,
  posts jsonb,
  primary key (handle, day)
);

-- Codes de connexion faits maison (send.ts) : seulement l'empreinte du code, une heure, 5 essais.
create table public.login_codes (
  email text primary key,
  hash text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  attempts int not null default 0
);

-- Qui est admin : rempli à la main, jamais depuis l'app.
create table public.admins (user_id uuid primary key references auth.users on delete cascade);

create function public.is_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admins where user_id = auth.uid()) $$;

-- À l'inscription : le profil (avec les réponses envoyées au moment du code) et la ligne de prospection.
create function public.on_signup() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, first_name, handle, rythme, answers)
  values (
    new.id, new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'handle', ''),
    coalesce((new.raw_user_meta_data->>'rythme')::int, 2),
    coalesce(new.raw_user_meta_data->'answers', '{}'::jsonb)
  );
  insert into public.leads (user_id) values (new.id);
  return new;
end $$;
create trigger on_signup after insert on auth.users for each row execute function public.on_signup();

-- Rythme bloqué : tant que la date n'est pas passée, le rythme ne bouge pas et le blocage ne raccourcit pas.
create function public.keep_lock() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if old.rythme_locked_until is not null and old.rythme_locked_until >= current_date then
    new.rythme := old.rythme;
    new.rythme_locked_until := greatest(old.rythme_locked_until, coalesce(new.rythme_locked_until, old.rythme_locked_until));
  end if;
  return new;
end $$;
create trigger keep_lock before update on public.profiles for each row execute function public.keep_lock();

-- Règles d'accès
alter table public.profiles enable row level security;
alter table public.contents enable row level security;
alter table public.leads enable row level security;
alter table public.ig_snapshots enable row level security;
alter table public.admins enable row level security;
alter table public.login_codes enable row level security;

create policy "profil : le sien" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profil : modifier le sien" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

create policy "contenus : les siens" on public.contents for select using (user_id = auth.uid() or public.is_admin());
create policy "contenus : créer" on public.contents for insert with check (user_id = auth.uid());
create policy "contenus : modifier" on public.contents for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "contenus : supprimer" on public.contents for delete using (user_id = auth.uid());

create policy "prospection : admin" on public.leads for all using (public.is_admin()) with check (public.is_admin());

create policy "instagram : le sien" on public.ig_snapshots for select
  using (public.is_admin() or handle = (select lower(p.handle) from public.profiles p where p.id = auth.uid()));

-- Fonctions internes : le déclencheur ne s'appelle pas depuis l'API, is_admin seulement une fois connecté.
revoke execute on function public.on_signup() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Le lien entre Semper et Meta : identifiant Instagram de Gael et jeton de page permanent (serveur seulement).
create table public.meta_link (id int primary key default 1 check (id = 1), ig_id text not null, token text not null, updated_at timestamptz not null default now());
alter table public.meta_link enable row level security;

-- Activité : une ligne par personne et par jour d'ouverture (rétention). Notée par l'app au chargement.
create table public.activity (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  day date not null default current_date,
  primary key (user_id, day)
);
alter table public.activity enable row level security;
create policy "activité : noter la sienne" on public.activity for insert with check (user_id = auth.uid());
create policy "activité : lire" on public.activity for select using (user_id = auth.uid() or public.is_admin());

-- Chiffres de l'admin (inscrits, démarrés, actifs, publient, reviennent en semaine 2). Vide pour un non-admin.
create function public.admin_kpis() returns json
language sql stable security definer set search_path = ''
as $$
  select case when public.is_admin() then json_build_object(
    'inscrits', (select count(*) from public.profiles),
    'inscrits_7j', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'demarres', (select count(distinct user_id) from public.contents),
    'actifs_7j', (select count(distinct user_id) from public.activity where day > current_date - 7),
    'actifs_30j', (select count(distinct user_id) from public.activity where day > current_date - 30),
    'publient_7j', (select count(distinct user_id) from public.contents where published_at >= to_char(current_date - 7, 'YYYY-MM-DD')),
    'eligibles_s2', (select count(*) from public.profiles where created_at < now() - interval '14 days'),
    'revenus_s2', (select count(*) from public.profiles p where p.created_at < now() - interval '14 days'
                   and exists (select 1 from public.activity a where a.user_id = p.id
                               and a.day between p.created_at::date + 7 and p.created_at::date + 13))
  ) end
$$;
revoke execute on function public.admin_kpis() from public, anon;
grant execute on function public.admin_kpis() to authenticated;

-- Photo de profil (migrations photo_de_profil*) : colonne + espace de stockage « avatars », un dossier par personne.
alter table public.profiles add column avatar_url text;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/webp', 'image/jpeg', 'image/png']) on conflict (id) do nothing;
create policy "avatar : déposer le sien" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar : remplacer le sien" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar : retirer le sien" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar : lire le sien" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- CRM (/admin) : les signaux de chaque inscrit (activité, dernier relevé Instagram et celui d'il y a 4 semaines).
-- Le classement (potentiel, usage, profil) se calcule dans app/(app)/admin/score.ts. Corps complet : migration crm_signaux.

-- Sécurité (audit du 8 oct 2026, migrations securite_profils, securite_contenus_activite, securite_avatars, limite_debit).
-- Remplace les règles écrites plus haut : auth.uid() et is_admin() évalués une fois par requête.

-- Profil : l'inscrit ne modifie que ses réglages. E-mail, date d'inscription et id restent au serveur.
revoke update on public.profiles from anon, authenticated;
grant update (first_name, handle, rythme, durations, answers, fields, structures, rythme_locked_until, seen_at, avatar_url) on public.profiles to authenticated;
create unique index profiles_email_key on public.profiles (lower(email));
alter table public.profiles
  add constraint profiles_avatar check (avatar_url is null or avatar_url ~ ('^https://hyeeraiobrpaucrdqcnq\.supabase\.co/storage/v1/object/public/avatars/' || id::text || '/avatar\.webp(\?v=[0-9]+)?$')),
  add constraint profiles_sizes check (
    char_length(first_name) <= 100 and char_length(handle) <= 100
    and octet_length(durations::text) < 2000 and octet_length(answers::text) < 20000
    and octet_length(coalesce(fields::text, '')) < 50000 and octet_length(coalesce(structures::text, '')) < 50000);

-- Pseudo Instagram : on note quand il change, pour ne montrer que les relevés pris depuis.
alter table public.profiles add column handle_set_at timestamptz not null default now();
create function public.stamp_handle() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if lower(new.handle) is distinct from lower(old.handle) then new.handle_set_at := now(); end if;
  return new;
end $$;
revoke execute on function public.stamp_handle() from public, anon, authenticated;
create trigger stamp_handle before update of handle on public.profiles for each row execute function public.stamp_handle();

drop policy "profil : le sien" on public.profiles;
create policy "profil : le sien" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
drop policy "profil : modifier le sien" on public.profiles;
create policy "profil : modifier le sien" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy "instagram : le sien" on public.ig_snapshots;
create policy "instagram : le sien" on public.ig_snapshots for select to authenticated
  using ((select public.is_admin()) or (
    handle = (select lower(p.handle) from public.profiles p where p.id = (select auth.uid()))
    and day >= (select p.handle_set_at::date from public.profiles p where p.id = (select auth.uid()))));

-- Contenus : taille bornée (moins de 256 ko pour étapes, champs et script réunis).
alter table public.contents add constraint contents_size check (
  pg_column_size(steps) + pg_column_size(field_values) + coalesce(pg_column_size(script), 0) < 262144
  and char_length(title) <= 500
  and char_length(coalesce(publish_at, '')) <= 40 and char_length(coalesce(published_at, '')) <= 40);
drop policy "contenus : les siens" on public.contents;
create policy "contenus : les siens" on public.contents for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy "contenus : créer" on public.contents;
create policy "contenus : créer" on public.contents for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy "contenus : modifier" on public.contents;
create policy "contenus : modifier" on public.contents for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy "contenus : supprimer" on public.contents;
create policy "contenus : supprimer" on public.contents for delete to authenticated
  using (user_id = (select auth.uid()));

-- Activité : seulement le jour même, à un jour près pour les fuseaux.
drop policy "activité : noter la sienne" on public.activity;
create policy "activité : noter la sienne" on public.activity for insert to authenticated
  with check (user_id = (select auth.uid()) and day between current_date - 1 and current_date + 1);
drop policy "activité : lire" on public.activity;
create policy "activité : lire" on public.activity for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Avatars : un seul fichier par personne, <id>/avatar.webp, en WebP, 512 ko au plus.
drop policy "avatar : déposer le sien" on storage.objects;
create policy "avatar : déposer le sien" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp');
drop policy "avatar : remplacer le sien" on storage.objects;
create policy "avatar : remplacer le sien" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp')
  with check (bucket_id = 'avatars' and name = (select auth.uid())::text || '/avatar.webp');
drop policy "avatar : retirer le sien" on storage.objects;
create policy "avatar : retirer le sien" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy "avatar : lire le sien" on storage.objects;
create policy "avatar : lire le sien" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
update storage.buckets set allowed_mime_types = array['image/webp'], file_size_limit = 524288 where id = 'avatars';

-- Limite de débit (app/limit.ts) : un passage par ligne, clé chiffrée (IP, e-mail ou compte), gardé un jour.
-- Serveur seulement : RLS sans règle, aucun droit pour anon et authenticated.
create table public.hits (key text not null, at timestamptz not null default now());
create index hits_key on public.hits (key, at);
alter table public.hits enable row level security;
revoke all on public.hits from anon, authenticated;
create function public.hit(k text, lim int, win int) returns boolean
language plpgsql set search_path = ''
as $$
declare n int;
begin
  perform pg_advisory_xact_lock(hashtext(k));
  delete from public.hits where at < now() - interval '1 day';
  select count(*) into n from public.hits where key = k and at > now() - make_interval(secs => win);
  if n >= lim then return false; end if;
  insert into public.hits (key) values (k);
  return true;
end $$;
revoke execute on function public.hit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit(text, int, int) to service_role;

-- Inscription : les réponses attendent avec le code (send.ts), le compte n'est créé qu'une fois le code juste.
alter table public.login_codes add column meta jsonb;

-- Pseudo Instagram : seulement les caractères qu'Instagram accepte, 30 au plus (cleanHandle et send.ts nettoient avant).
alter table public.profiles add constraint profiles_handle check (handle ~ '^[A-Za-z0-9._]{0,30}$');

-- ============================================================
-- CRM v2 (/admin) : prospection, historique, lecture admin. Migrations crm_* (9 oct 2026).
-- ============================================================
-- CRM v2 (/admin) : migrations appliquées le 8 oct 2026 (crm_prospection, crm_lecture) et le 9 oct (crm_regles_dates).
-- À fusionner en fin de schema.sql. admin_signals reste en place tant que l'ancienne page tourne en production.

-- ================================================================
-- Migration A : prospection (colonnes, historique, dates posées par la base)
-- ================================================================

-- A1. Étapes : clés existantes gardées, deux étapes ajoutées, la base refuse le reste.
alter table public.leads
  add constraint leads_status_check check (status in ('verifier','qualifie','contacte','discussion','appel','client','non')),
  add column next_action text check (next_action in ('ecrire','relancer','appel')),
  add column next_action_at date,
  add column owner uuid references public.admins (user_id) on delete set null,
  add column last_contact_at timestamptz,
  add column stage_at timestamptz not null default now(),
  add column amount int check (amount between 0 and 100000),
  add column lost_reason text check (lost_reason in ('budget','moment','profil','silence'));
-- Les lignes existantes entrent dans leur étape à la date de leur dernier changement.
update public.leads set stage_at = updated_at;
create index leads_todo on public.leads (next_action_at) where status not in ('client','non');

-- A2. Historique : une ligne par geste. Ajout seul : ni modification ni suppression (sauf cascade).
create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (user_id) on delete cascade,
  author uuid default auth.uid() references auth.users on delete set null,
  kind text not null check (kind in ('etape','dm','relance','reponse','appel','note')),
  body text not null default '' check (length(body) <= 4000),
  from_status text,
  to_status text,
  at timestamptz not null default now()
);
create index lead_events_lead on public.lead_events (lead_id, at desc);
alter table public.lead_events enable row level security;
revoke update, delete, truncate on public.lead_events from anon, authenticated;
create policy "historique : lire (admin)" on public.lead_events for select to authenticated
  using (public.is_admin());
create policy "historique : ajouter (admin, en son nom)" on public.lead_events for insert to authenticated
  with check (public.is_admin() and author = auth.uid() and kind <> 'etape');

-- A3. Les dates viennent de la base, pas du navigateur. Chaque changement d'étape s'écrit dans l'historique.
create function public.lead_touch() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.stage_at := now();
    insert into public.lead_events (lead_id, author, kind, from_status, to_status)
    values (new.user_id, auth.uid(), 'etape', old.status, new.status);
  end if;
  return new;
end $$;
create trigger lead_touch before update on public.leads for each row execute function public.lead_touch();

create function public.lead_contact() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.kind in ('dm','relance','appel') then
    update public.leads set last_contact_at = new.at where user_id = new.lead_id;
  end if;
  return new;
end $$;
create trigger lead_contact after insert on public.lead_events for each row execute function public.lead_contact();
revoke execute on function public.lead_touch(), public.lead_contact() from public, anon, authenticated;

-- A4. Reprise : l'étape actuelle de chacun entre dans l'historique (pour l'entonnoir).
insert into public.lead_events (lead_id, author, kind, to_status, at)
select user_id, null, 'etape', status, updated_at from public.leads;

-- ================================================================
-- Migration B : lecture (une seule fonction pour la liste, chiffres sans les admins, entonnoir)
-- ================================================================

-- B0. Une date de contenu illisible (écrite à la main par l'API) devient null au lieu de faire échouer tout le CRM.
create function public.crm_day(t text) returns date
language plpgsql immutable set search_path = ''
as $$
begin
  return left(t, 10)::date;
exception when others then
  return null;
end $$;
revoke execute on function public.crm_day(text) from public, anon, authenticated;

-- B1. Tout ce que la liste et la fiche affichent, en un appel. Remplace profiles + contents + leads + admin_signals.
-- Les compteurs de contenus sont calculés en base : plus de téléchargement de tous les contenus.
create or replace function public.admin_people()
returns table (
  user_id uuid, email text, first_name text, handle text, avatar_url text, rythme int, answers jsonb, created_at timestamptz,
  status text, note text, next_action text, next_action_at date, owner uuid, last_contact_at timestamptz,
  stage_at timestamptz, amount int, lost_reason text,
  last_active date, active_days_30 int,
  contents_total int, contents_planned int, contents_published int, published_30 int, weeks_held_4 int,
  ig_day date, ig_followers int, ig_followers_before int, ig_avg_likes numeric, ig_avg_comments numeric, ig_media int, ig_posts jsonb
)
language sql stable security definer set search_path = ''
as $$
  with last_ig as (
    select distinct on (handle) handle, day, followers, avg_likes, avg_comments, media, posts
    from public.ig_snapshots order by handle, day desc
  ), before_ig as (
    select distinct on (handle) handle, followers
    from public.ig_snapshots where day <= current_date - 28 order by handle, day desc
  ), c as (
    select user_id,
      count(*)::int as total,
      count(*) filter (where publish_at is not null and published_at is null)::int as planned,
      count(*) filter (where published_at is not null)::int as published,
      count(*) filter (where published_at >= to_char(current_date - 30, 'YYYY-MM-DD'))::int as published_30
    from public.contents group by user_id
  ), w as (
    select x.user_id, count(*)::int as weeks_held_4 from (
      select ct.user_id, date_trunc('week', public.crm_day(coalesce(ct.publish_at, ct.published_at))) as wk, count(*) as n
      from public.contents ct
      where ct.published_at is not null
        and public.crm_day(coalesce(ct.publish_at, ct.published_at)) >= date_trunc('week', current_date) - interval '28 days'
        and public.crm_day(coalesce(ct.publish_at, ct.published_at)) < date_trunc('week', current_date)
      group by 1, 2
    ) x join public.profiles p on p.id = x.user_id
    where x.n >= greatest(p.rythme, 1)
    group by x.user_id
  )
  select p.id, p.email, p.first_name, p.handle, p.avatar_url, p.rythme, p.answers, p.created_at,
    coalesce(l.status, 'verifier'), coalesce(l.note, ''), l.next_action, l.next_action_at, l.owner, l.last_contact_at,
    coalesce(l.stage_at, p.created_at), l.amount, l.lost_reason,
    (select max(a.day) from public.activity a where a.user_id = p.id),
    (select count(*)::int from public.activity a where a.user_id = p.id and a.day > current_date - 30),
    coalesce(c.total, 0), coalesce(c.planned, 0), coalesce(c.published, 0), coalesce(c.published_30, 0), coalesce(w.weeks_held_4, 0),
    li.day, li.followers, b.followers, li.avg_likes, li.avg_comments, li.media, li.posts
  from public.profiles p
  left join public.leads l on l.user_id = p.id
  left join c on c.user_id = p.id
  left join w on w.user_id = p.id
  left join last_ig li on li.handle = lower(p.handle)
  left join before_ig b on b.handle = lower(p.handle)
  where public.is_admin()
    and not exists (select 1 from public.admins ad where ad.user_id = p.id)
  order by p.created_at desc, p.id
$$;
revoke execute on function public.admin_people() from public, anon;
grant execute on function public.admin_people() to authenticated;

-- B2. Chiffres produit, sans les comptes admins.
create or replace function public.admin_kpis() returns json
language sql stable security definer set search_path = ''
as $$
  with people as (select p.* from public.profiles p where not exists (select 1 from public.admins a where a.user_id = p.id))
  select case when public.is_admin() then json_build_object(
    'inscrits', (select count(*) from people),
    'inscrits_7j', (select count(*) from people where created_at > now() - interval '7 days'),
    'demarres', (select count(distinct c.user_id) from public.contents c join people p on p.id = c.user_id),
    'actifs_7j', (select count(distinct a.user_id) from public.activity a join people p on p.id = a.user_id where a.day > current_date - 7),
    'actifs_30j', (select count(distinct a.user_id) from public.activity a join people p on p.id = a.user_id where a.day > current_date - 30),
    'publient_7j', (select count(distinct c.user_id) from public.contents c join people p on p.id = c.user_id where c.published_at >= to_char(current_date - 7, 'YYYY-MM-DD')),
    'eligibles_s2', (select count(*) from people where created_at < now() - interval '14 days'),
    'revenus_s2', (select count(*) from people p where p.created_at < now() - interval '14 days'
                   and exists (select 1 from public.activity a where a.user_id = p.id
                               and a.day between p.created_at::date + 7 and p.created_at::date + 13))
  ) end
$$;

-- B3. Entonnoir : combien ont ATTEINT chaque étape (même s'ils sont passés à « Pas pour nous » ensuite).
create function public.admin_funnel(since timestamptz default null) returns json
language sql stable security definer set search_path = ''
as $$
  with lvl_of(status, lvl) as (values ('verifier',0),('qualifie',1),('contacte',2),('discussion',3),('appel',4),('client',5),('non',0)),
  people as (
    select p.id, p.created_at from public.profiles p
    where (since is null or p.created_at >= since)
      and not exists (select 1 from public.admins a where a.user_id = p.id)
  ),
  reached as (
    select pe.id, greatest(
      coalesce((select max(v.lvl) from public.lead_events e join lvl_of v on v.status = e.to_status
                where e.lead_id = pe.id and e.kind = 'etape'), 0),
      coalesce((select v.lvl from public.leads l join lvl_of v on v.status = l.status where l.user_id = pe.id), 0)
    ) as lvl
    from people pe
  ),
  first_dm as (
    select pe.id, pe.created_at, min(e.at) as at
    from people pe join public.lead_events e on e.lead_id = pe.id and e.kind = 'dm'
    group by pe.id, pe.created_at
  )
  select case when public.is_admin() then json_build_object(
    'inscrits',   (select count(*) from reached),
    'qualifies',  (select count(*) from reached where lvl >= 1),
    'contactes',  (select count(*) from reached where lvl >= 2),
    'reponses',   (select count(*) from reached where lvl >= 3),
    'appels',     (select count(*) from reached where lvl >= 4),
    'clients',    (select count(*) from reached where lvl >= 5),
    'ca',         (select coalesce(sum(l.amount), 0) from public.leads l join people pe on pe.id = l.user_id where l.status = 'client'),
    'delai_premier_dm_h', (select round((percentile_cont(0.5) within group (order by extract(epoch from (at - created_at)) / 3600))::numeric, 1) from first_dm)
  ) end
$$;
revoke execute on function public.admin_funnel(timestamptz) from public, anon;
grant execute on function public.admin_funnel(timestamptz) to authenticated;

-- B4. L'équipe (les admins) : pour le filtre Responsable, la colonne Qui et l'auteur de chaque geste.
create function public.admin_team() returns table (user_id uuid, first_name text, email text)
language sql stable security definer set search_path = ''
as $$
  select a.user_id, coalesce(p.first_name, ''), coalesce(p.email, '')
  from public.admins a left join public.profiles p on p.id = a.user_id
  where public.is_admin()
$$;
revoke execute on function public.admin_team() from public, anon;
grant execute on function public.admin_team() to authenticated;

-- ================================================================
-- Migration C : règles évaluées une fois par requête, dates tenues par la base (9 oct 2026, crm_regles_dates)
-- Remplace les règles de A2 et le corps de lead_touch (A3).
-- ================================================================

-- C1. auth.uid() et is_admin() évalués une fois par requête, réservés aux comptes connectés.
drop policy "prospection : admin" on public.leads;
create policy "prospection : admin" on public.leads for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy "historique : lire (admin)" on public.lead_events;
create policy "historique : lire (admin)" on public.lead_events for select to authenticated
  using ((select public.is_admin()));
drop policy "historique : ajouter (admin, en son nom)" on public.lead_events;
create policy "historique : ajouter (admin, en son nom)" on public.lead_events for insert to authenticated
  with check ((select public.is_admin()) and author = (select auth.uid()) and kind <> 'etape');

-- C2. Les dates restent à la base : stage_at ne bouge qu'avec l'étape, last_contact_at qu'avec l'historique.
create or replace function public.lead_touch() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    new.stage_at := now();
    insert into public.lead_events (lead_id, author, kind, from_status, to_status)
    values (new.user_id, auth.uid(), 'etape', old.status, new.status);
  else
    new.stage_at := old.stage_at;
  end if;
  -- lead_contact l'écrit depuis un déclencheur (profondeur 2) ; une écriture directe est ignorée.
  if pg_trigger_depth() = 1 then
    new.last_contact_at := old.last_contact_at;
  end if;
  return new;
end $$;
revoke execute on function public.lead_touch() from public, anon, authenticated;
