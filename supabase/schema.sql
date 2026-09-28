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

-- Envois de codes de connexion : un par minute et par adresse, contre les abus.
create table public.code_sends (email text primary key, at timestamptz not null default now());

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
alter table public.code_sends enable row level security;

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
