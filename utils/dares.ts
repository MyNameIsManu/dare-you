import { t } from "../src/i18n";
import { getMyId, toError } from "./db";
import { supabase } from "./supabase";

export type NewDare = {
  title: string;
  description?: string;
  /** The day the dare is due; it ends at 23:59 local time on that day. */
  dueDate: Date;
  /** Who has to do it. Omit to dare yourself. Must be an accepted friend otherwise. */
  assigneeId?: string;
};

export type Dare = {
  id: number;
  title: string;
  description: string | null;
  deadline: string;
  status:
    | "pending"
    | "open"
    | "submitted"
    | "declined"
    | "expired" // invitation not answered before the deadline
    | "completed"
    | "failed";
  created_at: string;
  accepted_at: string | null; // start of the dare; null while pending/declined/expired
  completed_at: string | null;
  proof_path: string | null; // photo in the "dare-proofs" bucket
  proof_submitted_at: string | null;
  creator_id: string;
  assignee_id: string;
  creator: DarePerson | null;
  assignee: DarePerson | null;
};

export type DarePerson = {
  username: string | null;
  display_name: string | null;
};

/** "Max" or "@max" — for showing who a dare is from or for. */
export function personName(p: DarePerson | null) {
  return (
    p?.display_name ??
    (p?.username ? `@${p.username}` : t("common.unknownPerson"))
  );
}

const DARE_FIELDS = `id, title, description, deadline, status, created_at,
  accepted_at, completed_at, proof_path, proof_submitted_at, creator_id, assignee_id,
  creator:profiles!dares_creator_id_fkey(username, display_name),
  assignee:profiles!dares_assignee_id_fkey(username, display_name)`;

export type MyDares = {
  invitations: Dare[]; // pending, sent to me: I have to accept or decline
  sent: Dare[]; // pending, I sent them: waiting for my friend's answer
  toReview: Dare[]; // proof submitted for a dare I created: I decide
  open: Dare[]; // running (incl. my proof waiting for review), soonest deadline first
  done: Dare[]; // finished: completed, failed, declined or expired, newest first
};

/** Dares I have to do or that I created, grouped by status. */
export async function getMyDares(): Promise<MyDares> {
  const myId = await getMyId();

  const { data, error } = await supabase
    .from("dares")
    .select(DARE_FIELDS)
    .or(`assignee_id.eq.${myId},creator_id.eq.${myId}`)
    .order("deadline", { ascending: true });

  if (error) throw toError(error);

  const dares = data as Dare[];
  const pending = dares.filter((d) => d.status === "pending");
  return {
    invitations: pending.filter((d) => d.assignee_id === myId),
    sent: pending.filter((d) => d.creator_id === myId),
    toReview: dares.filter(
      (d) => d.status === "submitted" && d.creator_id === myId,
    ),
    open: dares.filter(
      (d) =>
        d.status === "open" ||
        (d.status === "submitted" && d.assignee_id === myId),
    ),
    done: dares
      .filter(
        (d) =>
          d.status === "completed" ||
          d.status === "failed" ||
          d.status === "declined" ||
          d.status === "expired",
      )
      .sort((a, b) => b.deadline.localeCompare(a.deadline)),
  };
}

/** End of the given day in local time (23:59:59.999). */
function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Create a dare and return its id.
 * Row Level Security only allows yourself or an accepted friend as assignee.
 */
export async function createDare(dare: NewDare): Promise<number> {
  const myId = await getMyId();
  const title = dare.title.trim();
  const description = dare.description?.trim() || null;

  // Same limits as the database, so the user gets a clear message
  if (title.length < 1 || title.length > 120) {
    throw new Error(t("dares.titleLength"));
  }

  const { data, error } = await supabase
    .from("dares")
    .insert({
      creator_id: myId,
      assignee_id: dare.assigneeId ?? myId,
      title,
      description,
      deadline: endOfDay(dare.dueDate).toISOString(),
    })
    .select("id")
    .single();

  if (error) throw toError(error);
  return data.id;
}

/**
 * Accept or decline a dare a friend sent you.
 * Runs respond_to_dare() in the database, which checks that you are the
 * assignee and that the dare is still pending. Returns the new status.
 */
export async function respondToDare(dareId: number, accept: boolean) {
  const { data, error } = await supabase.rpc("respond_to_dare", {
    target_dare_id: dareId,
    accept,
  });
  if (error) throw toError(error);
  return data as "open" | "declined";
}

/**
 * Withdraw a dare you sent that hasn't been answered yet (deletes it).
 * Only deletes while still pending, so an already accepted dare isn't
 * removed by accident if your friend answered in the meantime.
 */
export async function withdrawDare(dareId: number) {
  const { data, error } = await supabase
    .from("dares")
    .delete()
    .eq("id", dareId)
    .eq("status", "pending")
    .select("id");

  if (error) throw toError(error);
  if (data.length === 0) {
    throw new Error(t("dares.alreadyAnswered"));
  }
}

/** One dare by id, or null if it doesn't exist or isn't visible to me. */
export async function getDare(id: number): Promise<Dare | null> {
  const { data, error } = await supabase
    .from("dares")
    .select(DARE_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw toError(error);
  return data as Dare | null;
}

const PROOF_BUCKET = "dare-proofs";

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/heic": "heic",
  "image/webp": "webp",
};

/**
 * Upload a proof photo and submit it.
 * Returns "submitted" (friend dare, creator decides) or "completed" (own dare).
 */
export async function submitDareProof(
  dareId: number,
  photo: { uri: string; mimeType?: string | null },
) {
  const contentType = photo.mimeType ?? "image/jpeg";
  const ext = EXTENSIONS[contentType] ?? "jpg";
  // New name every time: a rejected photo is never overwritten
  const path = `${dareId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // Read the picked file (file:// on mobile, blob: on web) as raw bytes
  const body = await (await fetch(photo.uri)).arrayBuffer();

  const { error: uploadError } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, body, { contentType, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase.rpc("submit_dare_proof", {
    target_dare_id: dareId,
    image_path: path,
  });
  if (error) throw toError(error);
  return data as "submitted" | "completed";
}

/**
 * Creator's decision on a submitted proof.
 * Returns "completed", "open" (rejected, try again) or "failed" (rejected after the deadline).
 */
export async function reviewDareProof(dareId: number, approve: boolean) {
  const { data, error } = await supabase.rpc("review_dare_proof", {
    target_dare_id: dareId,
    approve,
  });
  if (error) throw toError(error);
  return data as "completed" | "open" | "failed";
}

/** Temporary URL (1 hour) for showing a proof photo from the private bucket. */
export async function getProofUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
