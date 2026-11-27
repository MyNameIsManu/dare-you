import NativeDatePicker from "@expo/ui/community/datetime-picker";
import { useState } from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getLocale, useI18n } from "@/i18n";

export type DateFieldProps = {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  accessibilityLabel?: string;
};

export function formatDate(date: Date) {
  return date.toLocaleDateString(getLocale(), {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * iOS: native compact picker (tap the pill → calendar popover).
 * Android: themed button that opens the Material date dialog.
 */
export function DateField({
  value,
  onChange,
  minimumDate,
  accessibilityLabel,
}: DateFieldProps) {
  const theme = useTheme();
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);

  if (Platform.OS === "ios") {
    return (
      <NativeDatePicker
        value={value}
        mode="date"
        display="compact"
        minimumDate={minimumDate}
        locale={locale.replace("-", "_")}
        themeVariant="light"
        accentColor={theme.accent}
        onValueChange={(_, date) => onChange(date)}
      />
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={t("create.datePickerHint")}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText style={styles.label}>{formatDate(value)}</ThemedText>
      </Pressable>

      {open && (
        <NativeDatePicker
          value={value}
          mode="date"
          presentation="dialog"
          minimumDate={minimumDate}
          accentColor={theme.accent}
          positiveButton={{ label: "OK" }}
          onValueChange={(_, date) => {
            setOpen(false);
            onChange(date);
          }}
          onDismiss={() => setOpen(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  label: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
});
