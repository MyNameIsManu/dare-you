import { supabase } from "./supabase";

/**
 * Supabase returns errors as plain objects ({ message, details, hint, code }),
 * not real Error instances. Wrap them so callers can rely on `e.message`,
 * and log the full object because `hint` often explains the fix.
 */
export function toError(error: {
  message: string;
  hint?: string;
  code?: string;
}) {
  console.error("Supabase error:", error);
  return new Error(error.message || error.code || "Unknown database error");
}

/** The signed-in user's id, or an error if nobody is signed in. */
export async function getMyId() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error("Not signed in");
  return id;
}
