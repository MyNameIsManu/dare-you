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

/**
 * Supabase returns errors as plain objects ({ message, details, hint, code }),
 * not real Error instances. Wrap them so callers can rely on `e.message`,
 * and log the full object because `hint` often explains the fix.
 */
function toError(error: { message: string; hint?: string; code?: string }) {
  console.error("Supabase error:", error);
  return new Error(error.message || error.code || "Unknown database error");
}

async function getMyId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
}

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
