import type { Dare } from "./dares";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type Urgency = "calm" | "soon" | "urgent";

export const UrgencyColors: Record<Urgency, string> = {
  calm: "#30A46C",
  soon: "#F76B15",
  urgent: "#E5484D",
};

export type DareProgress = {
  /** Share of the time span already used, 0–1 */
  elapsed: number;
  /** Milliseconds until the deadline (negative when it has passed) */
  remainingMs: number;
  /** Whole days since the start / total days (rounded, at least 1) */
  daysPassed: number;
  daysTotal: number;
  urgency: Urgency;
};

/** The dare starts when it was accepted (own dares: when created). */
export function dareStart(dare: Dare) {
  return new Date(dare.accepted_at ?? dare.created_at).getTime();
}

export function dareProgress(dare: Dare, now: number): DareProgress {
  const start = dareStart(dare);
  const end = new Date(dare.deadline).getTime();
  const total = Math.max(end - start, 1);
  const remainingMs = end - now;
  const elapsed = Math.min(Math.max((now - start) / total, 0), 1);

  // Colour by absolute time left, so a 3-hour dare is red even at 0 %
  const urgency: Urgency =
    remainingMs < DAY
      ? "urgent"
      : remainingMs < 3 * DAY || elapsed > 0.75
        ? "soon"
        : "calm";

  return {
    elapsed,
    remainingMs,
    daysPassed: Math.max(Math.floor((now - start) / DAY), 0),
    daysTotal: Math.max(Math.round(total / DAY), 1),
    urgency,
  };
}

/** "3 Tage", "5 Std.", "20 Min." — days only once more than 48 h are left. */
export function formatRemaining(ms: number) {
  if (ms <= 0) return "abgelaufen";
  if (ms >= 2 * DAY) return `${Math.floor(ms / DAY)} Tage`;
  if (ms >= HOUR) return `${Math.floor(ms / HOUR)} Std.`;
  return `${Math.max(Math.floor(ms / 60000), 1)} Min.`;
}

/** "Tag 12 / 30", or "noch 5 Std." once less than 48 h are left. */
export function progressLabel(progress: DareProgress) {
  return progress.remainingMs < 2 * DAY
    ? `noch ${formatRemaining(progress.remainingMs)}`
    : `Tag ${progress.daysPassed} / ${progress.daysTotal}`;
}
