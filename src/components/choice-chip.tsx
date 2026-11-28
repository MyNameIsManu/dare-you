import { Pressable, StyleSheet } from "react-native";

import { glassSurface } from "@/components/glass-card";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** A pill for quick choices (e.g. a deadline). Selected = solid, otherwise glass. */
export function ChoiceChip({
  label,
  selected,
  onPress,
  dashed = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** Outlined, transparent look for an other-choice. */
  dashed?: boolean;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected
          ? { backgroundColor: theme.text }
          : dashed
            ? {
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: theme.backgroundSelected,
              }
            : glassSurface(theme),
        pressed && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={{ color: selected ? theme.background : theme.text }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
