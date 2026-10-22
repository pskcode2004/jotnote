-- Jotnote schema. Run the whole file in Supabase Dashboard -> SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null default ''
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.note_members (
  note_id uuid not null references public.notes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  primary key (note_id, user_id)
);

create table if not exists public.blocks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  position int not null default 0,
  type text not null check (type in ('text','checklist')),
  content text not null default '',
  checked boolean not null default false,
  assigned_to uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists blocks_note_pos on public.blocks(note_id, position);
create index if not exists blocks_assigned on public.blocks(assigned_to);

-- Profile row for every new auth user
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, email, display_name)
  values (new.id, lower(new.email),
          coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Server-side stamp of who edited a block and when
create or replace function public.blocks_touch() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  update public.notes set updated_at = now() where id = new.note_id;
  return new;
end $$;

drop trigger if exists blocks_touch on public.blocks;
create trigger blocks_touch before insert or update on public.blocks
  for each row execute function public.blocks_touch();

-- Permission helpers (security definer avoids recursive RLS)
create or replace function public.can_read_note(nid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from notes n where n.id = nid and n.owner_id = auth.uid())
      or exists (select 1 from note_members m where m.note_id = nid and m.user_id = auth.uid());
$$;

create or replace function public.can_edit_note(nid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from notes n where n.id = nid and n.owner_id = auth.uid())
      or exists (select 1 from note_members m
                 where m.note_id = nid and m.user_id = auth.uid() and m.role = 'editor');
$$;

alter table public.profiles enable row level security;
alter table public.notes enable row level security;
alter table public.note_members enable row level security;
alter table public.blocks enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated using (true);
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists notes_select on public.notes;
create policy notes_select on public.notes for select to authenticated
  using (owner_id = auth.uid() or can_read_note(id));
drop policy if exists notes_insert on public.notes;
create policy notes_insert on public.notes for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists notes_update on public.notes;
create policy notes_update on public.notes for update to authenticated
  using (owner_id = auth.uid() or can_edit_note(id));
drop policy if exists notes_delete on public.notes;
create policy notes_delete on public.notes for delete to authenticated using (owner_id = auth.uid());

drop policy if exists members_select on public.note_members;
create policy members_select on public.note_members for select to authenticated using (can_read_note(note_id));
drop policy if exists members_write on public.note_members;
create policy members_write on public.note_members for all to authenticated
  using (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (exists (select 1 from notes n where n.id = note_id and n.owner_id = auth.uid()));

drop policy if exists blocks_select on public.blocks;
create policy blocks_select on public.blocks for select to authenticated using (can_read_note(note_id));
drop policy if exists blocks_insert on public.blocks;
create policy blocks_insert on public.blocks for insert to authenticated with check (can_edit_note(note_id));
drop policy if exists blocks_update on public.blocks;
create policy blocks_update on public.blocks for update to authenticated
  using (can_edit_note(note_id)) with check (can_edit_note(note_id));
drop policy if exists blocks_delete on public.blocks;
create policy blocks_delete on public.blocks for delete to authenticated using (can_edit_note(note_id));

-- Realtime (DELETE events need full row to filter by note_id)
alter table public.blocks replica identity full;
alter publication supabase_realtime add table public.blocks;
alter publication supabase_realtime add table public.note_members;
