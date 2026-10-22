-- Run once in Supabase SQL Editor AFTER migration-002.sql.
-- Invite codes: the owner creates a 6-character code, anyone signed in can join with it.

create table if not exists public.note_invites (
  note_id uuid primary key references public.notes(id) on delete cascade,
  code text not null unique,
  role text not null check (role in ('editor','viewer'))
);

alter table public.note_invites enable row level security;

drop policy if exists invites_owner on public.note_invites;
create policy invites_owner on public.note_invites for all to authenticated
  using (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()))
  with check (exists (select 1 from public.notes n where n.id = note_id and n.owner_id = auth.uid()));

-- Owner creates (or replaces) the note's invite code
create or replace function public.create_invite(nid uuid, r text) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if r not in ('editor','viewer') then raise exception 'invalid role'; end if;
  if not exists (select 1 from notes where id = nid and owner_id = auth.uid()) then
    raise exception 'not owner';
  end if;
  loop
    c := '';
    for i in 1..6 loop
      c := c || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    begin
      insert into note_invites(note_id, code, role) values (nid, c, r)
      on conflict (note_id) do update set code = excluded.code, role = excluded.role;
      return c;
    exception when unique_violation then
      null; -- code collision with another note, draw again
    end;
  end loop;
end $$;

-- Anyone signed in joins with a valid code; returns the note id
create or replace function public.join_note_by_code(c text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  inv note_invites%rowtype;
  owner uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into inv from note_invites where code = upper(trim(c));
  if not found then raise exception 'invalid code'; end if;
  select owner_id into owner from notes where id = inv.note_id;
  if owner = auth.uid() then return inv.note_id; end if;
  insert into note_members(note_id, user_id, role)
  values (inv.note_id, auth.uid(), inv.role)
  on conflict (note_id, user_id) do nothing;
  return inv.note_id;
end $$;

revoke all on function public.create_invite(uuid, text) from public, anon;
revoke all on function public.join_note_by_code(text) from public, anon;
grant execute on function public.create_invite(uuid, text) to authenticated;
grant execute on function public.join_note_by_code(text) to authenticated;
