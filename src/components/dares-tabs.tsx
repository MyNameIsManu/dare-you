import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type Option<T extends string> = { value: T; label: string; badge?: number };

/** Two-way switch under the screen title; a red badge counts what waits for you. */
export function DaresTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.tab,
              selected && {
                backgroundColor: "#FFFFFF",
                boxShadow: `0 2px 8px ${theme.glassShadow}`,
              },
              pressed && !selected && styles.pressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              themeColor={selected ? "text" : "textSecondary"}
            >
              {option.label}
            </ThemedText>
            {!!option.badge && (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <ThemedText type="smallBold" style={styles.badgeText}>
                  {option.badge > 9 ? "9+" : option.badge}
                </ThemedText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: 2,
    padding: 4,
    borderRadius: Spacing.four + Spacing.one,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one + 2,
    borderRadius: Spacing.four,
  },
  pressed: { opacity: 0.7 },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#FFFFFF", fontSize: 11, lineHeight: 14 },
});
