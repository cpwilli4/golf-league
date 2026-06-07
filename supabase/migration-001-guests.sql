-- Migration: guest player support.
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.
-- (Only needed for databases created before this feature; new installs
-- using schema.sql already include these columns.)

alter table rounds add column if not exists is_guest boolean not null default false;
alter table rounds add column if not exists plays_skins boolean not null default true;
alter table rounds add column if not exists plays_kp boolean not null default true;
