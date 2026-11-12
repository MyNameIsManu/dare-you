import { getMyId, toError } from "./db";
import { supabase } from "./supabase";

export type PublicProfile = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type FriendshipEntry = {
  friendshipId: number;
  profile: PublicProfile;
};

export type FriendLists = {
  friends: FriendshipEntry[];
  incoming: FriendshipEntry[]; // requests others sent to me
  outgoing: FriendshipEntry[]; // requests I sent, not yet accepted
};

const PROFILE_FIELDS = "id, username, display_name, avatar_url";

/** Find users whose username starts with the query (min. 2 characters). */
export async function searchUsers(query: string): Promise<PublicProfile[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];

  const myId = await getMyId();
  // _ and % are wildcards in LIKE, so escape them
  const escaped = q.replace(/[\\%_]/g, "\\$&");

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .ilike("username", `${escaped}%`)
    .neq("id", myId)
    .order("username")
    .limit(20);

  if (error) throw toError(error);
  return data;
}

/** Load one public profile by id. Returns null if no such user exists. */
export async function getProfile(id: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw toError(error);
  return data;
}

export type FriendshipStatus =
  | { kind: "self" }
  | { kind: "none" }
  | { kind: "friends"; friendshipId: number }
  | { kind: "outgoing"; friendshipId: number } // I asked them
  | { kind: "incoming"; friendshipId: number }; // they asked me

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** My relationship with another user. */
export async function getFriendshipWith(
  otherId: string,
): Promise<FriendshipStatus> {
  const myId = await getMyId();
  if (otherId === myId) return { kind: "self" };
  // otherId comes from the URL and is placed into a filter string below
  if (!UUID_PATTERN.test(otherId)) return { kind: "none" };

  // RLS only returns friendships I'm part of, so any row involving
  // the other user is the one between the two of us.
  const { data, error } = await supabase
    .from("friendships")
    .select("id, status, requester_id")
    .or(`requester_id.eq.${otherId},addressee_id.eq.${otherId}`)
    .maybeSingle();

  if (error) throw toError(error);
  if (!data) return { kind: "none" };
  if (data.status === "accepted")
    return { kind: "friends", friendshipId: data.id };
  return data.requester_id === myId
    ? { kind: "outgoing", friendshipId: data.id }
    : { kind: "incoming", friendshipId: data.id };
}

/** Send a friend request, or accept theirs if they already asked you. */
export async function sendFriendRequest(username: string) {
  const { data, error } = await supabase.rpc("send_friend_request", {
    target_username: username,
  });
  if (error) throw toError(error);
  return data as
    "requested" | "accepted" | "already_requested" | "already_friends";
}

/** All my friendships, split into friends, incoming and outgoing requests. */
export async function getFriendLists(): Promise<FriendLists> {
  const myId = await getMyId();

  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, status, requester_id, addressee_id,
       requester:profiles!friendships_requester_id_fkey(${PROFILE_FIELDS}),
       addressee:profiles!friendships_addressee_id_fkey(${PROFILE_FIELDS})`,
    )
    .order("created_at", { ascending: false });

  if (error) throw toError(error);

  const lists: FriendLists = { friends: [], incoming: [], outgoing: [] };

  for (const row of data) {
    const iAmRequester = row.requester_id === myId;
    const entry: FriendshipEntry = {
      friendshipId: row.id,
      profile: (iAmRequester ? row.addressee : row.requester) as PublicProfile,
    };

    if (row.status === "accepted") lists.friends.push(entry);
    else if (iAmRequester) lists.outgoing.push(entry);
    else lists.incoming.push(entry);
  }

  return lists;
}

/** Accept a request someone sent you. */
export async function acceptFriendRequest(friendshipId: number) {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", friendshipId);
  if (error) throw toError(error);
}

/** Decline an incoming request, cancel an outgoing one, or remove a friend. */
export async function removeFriendship(friendshipId: number) {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);
  if (error) throw toError(error);
}
