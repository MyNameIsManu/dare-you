-- Live updates for dares via Supabase Realtime
--
-- The app subscribes to changes of dares it is part of (as creator or
-- assignee). RLS still decides which changes each user receives.

-- Send inserts/updates/deletes of this table to Realtime subscribers
alter publication supabase_realtime add table public.dares;

-- Include all columns in DELETE events. Without this a deleted row only
-- carries its id, so filters like "assignee_id=eq.<me>" could never match
-- and the assignee wouldn't notice when a pending dare is withdrawn.
alter table public.dares replica identity full;
