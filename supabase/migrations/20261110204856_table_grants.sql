-- Table privileges for the Data API
--
-- New tables are not exposed to the API roles automatically, so signed-in
-- users need explicit GRANTs. These only open the door: Row Level Security
-- policies (initial_schema.sql) still decide which rows each user can touch.
-- Grants mirror the existing policies; nothing is granted to `anon`.

-- Profiles: read everyone, update your own (rows are inserted by the
-- handle_new_user trigger, which runs as security definer)
grant select, update on public.profiles to authenticated;

-- Friendships: see, send and remove requests.
-- UPDATE is already limited to the status column (friends migration).
grant select, insert, delete on public.friendships to authenticated;

-- Dares: full CRUD, limited per row by RLS
grant select, insert, update, delete on public.dares to authenticated;

-- Dare updates: read, post and delete (no editing)
grant select, insert, delete on public.dare_updates to authenticated;
