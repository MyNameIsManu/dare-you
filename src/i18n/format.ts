import { getLocale } from "./index";

/** "Fr., 28. November 2026" / "Fri, November 28, 2026" in the app's language. */
export function formatDate(date: Date) {
  return date.toLocaleDateString(getLocale(), {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
