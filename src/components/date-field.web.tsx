import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

import type { DateFieldProps } from "./date-field";

function toInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Web: the browser's native date input (@expo/ui's DateTimePicker has no web support). */
export function DateField({
  value,
  onChange,
  minimumDate,
  accessibilityLabel,
}: DateFieldProps) {
  const theme = useTheme();

  return (
    <input
      type="date"
      aria-label={accessibilityLabel}
      value={toInputValue(value)}
      min={minimumDate ? toInputValue(minimumDate) : undefined}
      onChange={(e) => {
        const [y, m, d] = e.target.value.split("-").map(Number);
        if (y && m && d) onChange(new Date(y, m - 1, d));
      }}
      style={{
        fontSize: 18,
        fontWeight: 600,
        fontFamily: "inherit",
        padding: `${Spacing.two}px ${Spacing.four}px`,
        borderRadius: Spacing.five,
        border: "none",
        color: theme.text,
        backgroundColor: theme.backgroundElement,
        colorScheme: "light dark",
      }}
    />
  );
}
