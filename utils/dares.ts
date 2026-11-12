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
  status: "open" | "completed" | "failed";
  created_at: string;
  creator_id: string;
  assignee_id: string;
};

export type MyDares = {
  open: Dare[]; // soonest deadline first
  done: Dare[]; // completed or failed, newest first
};

/** Dares I have to do or that I created, split into open and done. */
export async function getMyDares(): Promise<MyDares> {
  const myId = await getMyId();

  const { data, error } = await supabase
    .from("dares")
    .select(
      "id, title, description, deadline, status, created_at, creator_id, assignee_id",
    )
    .or(`assignee_id.eq.${myId},creator_id.eq.${myId}`)
    .order("deadline", { ascending: true });

  if (error) throw toError(error);

  const dares = data as Dare[];
  return {
    open: dares.filter((d) => d.status === "open"),
    done: dares
      .filter((d) => d.status !== "open")
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
    throw new Error("The title must be between 1 and 120 characters.");
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
