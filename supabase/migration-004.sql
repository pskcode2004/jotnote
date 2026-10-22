-- Run once in Supabase SQL Editor AFTER migration-003.sql.
-- Text color for blocks (headings also use it as the section accent).
alter table public.blocks add column if not exists color text;
alter table public.blocks drop constraint if exists blocks_color_check;
alter table public.blocks add constraint blocks_color_check
  check (color is null or color ~ '^#[0-9A-Fa-f]{6}$');
