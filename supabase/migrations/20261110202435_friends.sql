-- Friends: usernames, safer friendship updates, friend request function

------------------------------------------------------------
-- USERNAMES: lowercase letters, digits and _ (3–30 chars)
------------------------------------------------------------
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-z0-9_]{3,30}$');

-- Store the username from sign-up together with the display name
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    nullif(lower(trim(new.raw_user_meta_data ->> 'username')), '')
  );
  return new;
end;
$$;

-- Lets the sign-up screen check a username before the account exists
create function public.is_username_available(name text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where username = lower(trim(name))
  );
$$;

revoke execute on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

------------------------------------------------------------
-- FRIENDSHIPS: only the status column may be updated
-- (stops the recipient from rewriting who sent the request)
------------------------------------------------------------
revoke update on public.friendships from anon, authenticated;
grant update (status) on public.friendships to authenticated;

------------------------------------------------------------
-- SEND FRIEND REQUEST by username
-- Returns: 'requested' | 'accepted' | 'already_requested' | 'already_friends'
-- If the other person already sent you a request, it is accepted instead.
-- Runs with the caller's permissions, so all access rules still apply.
------------------------------------------------------------
create function public.send_friend_request(target_username text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target uuid;
  existing public.friendships%rowtype;
begin
  if me is null then
    raise exception 'Not signed in';
  end if;

  select id into target
  from public.profiles
  where username = lower(trim(target_username));

  if target is null then
    raise exception 'User not found';
  end if;

  if target = me then
    raise exception 'You cannot add yourself';
  end if;

  select * into existing
  from public.friendships
  where (requester_id = me and addressee_id = target)
     or (requester_id = target and addressee_id = me);

  if found then
    if existing.status = 'accepted' then
      return 'already_friends';
    end if;
    if existing.requester_id = me then
      return 'already_requested';
    end if;
    -- They already asked you: accept their request
    update public.friendships set status = 'accepted' where id = existing.id;
    return 'accepted';
  end if;

  insert into public.friendships (requester_id, addressee_id)
  values (me, target);
  return 'requested';
end;
$$;

revoke execute on function public.send_friend_request(text) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;