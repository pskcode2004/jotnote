-- Run once in Supabase SQL Editor AFTER schema.sql.

-- Heading blocks and due dates
alter table public.blocks drop constraint if exists blocks_type_check;
alter table public.blocks add constraint blocks_type_check
  check (type in ('text','checklist','heading'));
alter table public.blocks add column if not exists due_date date;

-- A member may leave a note shared with them
drop policy if exists members_leave on public.note_members;
create policy members_leave on public.note_members for delete to authenticated
  using (user_id = auth.uid());

-- Live notes list (new shares / deletes show up without refresh)
alter table public.notes replica identity full;
do $$ begin
  alter publication supabase_realtime add table public.notes;
exception when duplicate_object then null;
end $$;

-- Delete the signed-in user's account (cascades to profile, notes, memberships)
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
