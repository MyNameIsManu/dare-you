import {
  UrgencyColors,
  dareProgress,
  progressLabel,
} from "@/../utils/dare-progress";
import type { Dare } from "@/../utils/dares";
import { type ReactNode, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { TimeProgressBar } from "@/components/time-progress-bar";
import { Spacing } from "@/constants/theme";
import { useNow } from "@/hooks/use-now";
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
  submitted: "Beweis eingereicht – wartet auf Bestätigung",
  declined: "✗ Abgelehnt",
  expired: "⌛ Abgelaufen – nicht angenommen",
  completed: "✓ Geschafft",
  failed: "✗ Nicht geschafft",
} as const;

/** One dare in a list. `highlight` makes it glow briefly (e.g. right after creating it). */
export function DareCard({
  dare,
  highlight = false,
  subtitle,
  actions,
  onPress,
}: {
  dare: Dare;
  highlight?: boolean;
  /** Extra line above the title, e.g. "An Max" */
  subtitle?: string;
  /** Buttons shown at the bottom of the card */
  actions?: ReactNode;
  /** Makes the card tappable, e.g. to open the detail screen */
  onPress?: () => void;
}) {
  const theme = useTheme();
  const now = useNow();
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
    dare.status === "open" && new Date(dare.deadline).getTime() < now;
  // Only a running dare that's still on time gets the bar
  const progress =
    dare.status === "open" && !isOverdue ? dareProgress(dare, now) : null;

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

      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityHint={onPress ? "Öffnet den Dare" : undefined}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
      >
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
        {progress ? (
          <View style={styles.progress}>
            <TimeProgressBar progress={progress} />
            <View style={styles.progressText}>
              <ThemedText type="small" themeColor="textSecondary">
                Fällig bis {formatDeadline(dare.deadline)}
              </ThemedText>
              <ThemedText
                type="smallBold"
                style={{ color: UrgencyColors[progress.urgency] }}
              >
                {progressLabel(progress)}
              </ThemedText>
            </View>
          </View>
        ) : (
          <ThemedText
            type="smallBold"
            style={isOverdue ? styles.overdue : undefined}
            themeColor={isOverdue ? undefined : "textSecondary"}
          >
            {/* Running and invited dares show their deadline, others their result */}
            {dare.status === "open" || dare.status === "pending"
              ? `${isOverdue ? "Überfällig seit" : "Fällig bis"} ${formatDeadline(dare.deadline)}`
              : STATUS_LABEL[dare.status]}
          </ThemedText>
        )}
        {actions && <View style={styles.actions}>{actions}</View>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
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
  progress: {
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  progressText: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  overdue: {
    color: "#E5484D",
  },
});
