import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { glassSurface } from "@/components/glass-card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** Large pill button for the main decision on a screen. Primary = accent, secondary = glass. */
export function BigButton({
  label,
  onPress,
  variant = "primary",
  busy = false,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  busy?: boolean;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const textColor = isPrimary ? theme.onAccent : theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        isPrimary
          ? {
              backgroundColor: theme.accent,
              boxShadow: `0 8px 20px ${theme.accentGlow}`,
            }
          : glassSurface(theme),
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <ThemedText style={[styles.label, { color: textColor }]}>
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.five,
  },
  label: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 700,
  },
  dimmed: {
    opacity: 0.6,
  },
});
