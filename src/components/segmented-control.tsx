import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type SegmentedControlProps<T extends string> = {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  /** Text shown for an option (default: the option itself) */
  getLabel?: (value: T) => string;
  size?: "large" | "small";
};

/** A pill-shaped single-choice toggle: exactly one option is active at a time. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  getLabel = (value) => value,
  size = "large",
}: SegmentedControlProps<T>) {
  const small = size === "small";
  const theme = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option)}
            style={({ pressed }) => [
              styles.segment,
              small && styles.segmentSmall,
              selected && [
                styles.segmentSelected,
                { backgroundColor: theme.text },
              ],
              pressed && !selected && styles.pressed,
            ]}
          >
            <ThemedText
              style={[
                styles.label,
                small && styles.labelSmall,
                { color: selected ? theme.background : theme.textSecondary },
              ]}
            >
              {getLabel(option)}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    padding: Spacing.one,
    borderRadius: Spacing.five,
    gap: Spacing.one,
  },
  segment: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
  },
  segmentSmall: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  segmentSelected: {
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 600,
  },
  labelSmall: {
    fontSize: 15,
    lineHeight: 22,
  },
});
