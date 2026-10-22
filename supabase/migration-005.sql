-- Run once in Supabase SQL Editor AFTER migration-004.sql.
-- Due date becomes a date AND time. Existing date-only values become 23:59 (Bangkok) of that day.
alter table public.blocks
  alter column due_date type timestamptz
  using ((due_date::timestamp + interval '23 hours 59 minutes') at time zone 'Asia/Bangkok');
