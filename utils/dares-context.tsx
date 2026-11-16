import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";

import { useAuth } from "./auth-context";
import { getMyDares, type MyDares } from "./dares";
import { supabase } from "./supabase";

/** Wait this long after a change before reloading, so a burst of events is one reload. */
const RELOAD_DELAY_MS = 300;

type DaresState = {
  /** null while loading or when signed out */
  dares: MyDares | null;
  error: string | null;
  /** Load the lists again right now */
  reload: () => Promise<void>;
  /** Number of things waiting for *me*: invitations + proofs to review */
  waitingForMe: number;
  /** Run `listener` whenever one of my dares changes. Returns an unsubscribe function. */
  onDareChange: (listener: () => void) => () => void;
};

const DaresContext = createContext<DaresState | null>(null);

/**
 * Keeps "my dares" up to date for the whole app:
 * loads them, listens to Realtime changes, and reloads when the app returns
 * to the foreground (the connection pauses while the app is in the background).
 */
export function DaresProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const myId = session?.user.id;

  const [dares, setDares] = useState<MyDares | null>(null);
  const [error, setError] = useState<string | null>(null);
  const listeners = useRef(new Set<() => void>());
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      setDares(await getMyDares());
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Dares konnten nicht geladen werden",
      );
    }
  }, []);

  // Realtime: one channel, two filters (Realtime filters can't do "OR")
  useEffect(() => {
    if (!myId) return;

    const handleChange = () => {
      listeners.current.forEach((listener) => listener());
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(reload, RELOAD_DELAY_MS);
    };

    const channel: RealtimeChannel = supabase
      .channel(`dares:${myId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dares",
          filter: `assignee_id=eq.${myId}`,
        },
        handleChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "dares",
          filter: `creator_id=eq.${myId}`,
        },
        handleChange,
      )
      .subscribe((status) => {
        // Load once the subscription is live, so no change slips through in between.
        // If Realtime fails, still load once — the lists just won't update live.
        if (status === "SUBSCRIBED") reload();
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("Realtime for dares unavailable:", status);
          reload();
        }
      });

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [myId, reload]);

  // Coming back from the background: catch up on anything we missed
  useEffect(() => {
    if (!myId) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reload();
    });
    return () => subscription.remove();
  }, [myId, reload]);

  const onDareChange = useCallback((listener: () => void) => {
    listeners.current.add(listener);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);

  // Signed out: never show the previous user's dares
  const visibleDares = myId ? dares : null;
  const waitingForMe = visibleDares
    ? visibleDares.invitations.length + visibleDares.toReview.length
    : 0;

  return (
    <DaresContext.Provider
      value={{ dares: visibleDares, error, reload, waitingForMe, onDareChange }}
    >
      {children}
    </DaresContext.Provider>
  );
}

export function useDares() {
  const context = useContext(DaresContext);
  if (!context) throw new Error("useDares must be used inside <DaresProvider>");
  return context;
}
