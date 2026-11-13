import type { Dare } from "@/../utils/dares";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

const HIGHLIGHT_COLOR = "#FF9F0A";

function formatDeadline(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

const STATUS_LABEL = {
  pending: "Wartet auf Antwort",
  declined: "Abgelehnt",
  completed: "✓ Geschafft",
  failed: "✗ Nicht geschafft",
} as const;

/** One dare in a list. `highlight` makes it glow briefly (e.g. right after creating it). */
export function DareCard({
  dare,
  highlight = false,
  subtitle,
}: {
  dare: Dare;
  highlight?: boolean;
  /** Extra line above the title, e.g. "An Max" */
  subtitle?: string;
}) {
  const theme = useTheme();
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!highlight) return;
    // Fade in quickly, hold, then fade out slowly
    glow.value = withSequence(
      withTiming(1, { duration: 250 }),
      withDelay(1200, withTiming(0, { duration: 900 })),
    );
  }, [highlight, glow]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + glow.value * 0.02 }],
  }));

  const isOverdue =
    dare.status === "open" && new Date(dare.deadline) < new Date();

  return (
    <Animated.View
      style={[
        styles.card,
        { backgroundColor: theme.backgroundElement },
        cardStyle,
      ]}
    >
      {/* Highlight layer: an orange outline + tint that fades out */}
      <Animated.View pointerEvents="none" style={[styles.glow, glowStyle]} />

      <View style={styles.content}>
        {subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
        <ThemedText style={styles.title}>{dare.title}</ThemedText>
        {dare.description && (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {dare.description}
          </ThemedText>
        )}
        <ThemedText
          type="smallBold"
          style={isOverdue ? styles.overdue : undefined}
          themeColor={isOverdue ? undefined : "textSecondary"}
        >
          {dare.status === "open"
            ? `${isOverdue ? "Überfällig seit" : "Fällig bis"} ${formatDeadline(dare.deadline)}`
            : STATUS_LABEL[dare.status]}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: "stretch",
    borderRadius: Spacing.three,
    overflow: "hidden",
  },
  glow: {
    ...StyleSheet.absoluteFill,
    borderRadius: Spacing.three,
    borderWidth: 2,
    borderColor: HIGHLIGHT_COLOR,
    backgroundColor: `${HIGHLIGHT_COLOR}26`, // ~15% tint
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.one,
  },
  title: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 600,
  },
  overdue: {
    color: "#E5484D",
  },
});
